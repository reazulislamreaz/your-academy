import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import {
  WHATSAPP_INVALID_MESSAGE,
  createErrorResponse,
  isStaffRole,
  isValidWhatsapp,
  normalizeWhatsapp,
} from '@your-academy/shared';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import type {
  AdminResetPasswordDto,
  AssignableStaffRole,
  CreateStaffUserDto,
  UpdateStaffUserDto,
} from './dto/staff-user.dto';

const STAFF_SELECT = {
  id: true,
  name: true,
  whatsappNumber: true,
  email: true,
  emailVerifiedAt: true,
  role: true,
  status: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

type StaffRow = Prisma.UserGetPayload<{ select: typeof STAFF_SELECT }>;
type Tx = Prisma.TransactionClient;

function fail(
  Exception: new (body: unknown) => Error,
  code: string,
  message: string,
): never {
  throw new Exception(createErrorResponse(code, message, newRequestId()));
}

/**
 * Admin-only management of dashboard accounts (DEC-048): create Admin/Moderator
 * accounts, edit them, change roles, reset moderator passwords, and (de)activate users.
 *
 * Invariants enforced here (not in the UI):
 * - nobody changes their own role or deactivates themselves;
 * - the last active admin can never be demoted or deactivated.
 */
@Injectable()
export class StaffUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateStaffUserDto, actorUserId: string) {
    const whatsappNumber = this.parseWhatsapp(dto.whatsappNumber);
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });
    // Free trials are disabled — equal timestamps keep the legacy columns filled.
    const now = new Date();

    let user: StaffRow;
    try {
      user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          whatsappNumber,
          passwordHash,
          role: dto.role,
          status: UserStatus.ACTIVE,
          trialStartedAt: now,
          trialEndsAt: now,
        },
        select: STAFF_SELECT,
      });
    } catch (err) {
      this.rethrowUnique(err);
    }

    await this.audit.record({
      actorUserId,
      action: 'STAFF_CREATE',
      entityType: 'user',
      entityId: user.id,
      metadata: { role: dto.role },
    });
    return this.serialize(user);
  }

  async update(id: string, dto: UpdateStaffUserDto, actorUserId: string) {
    const target = await this.findStaff(id);
    const data: Prisma.UserUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.whatsappNumber !== undefined) data.whatsappNumber = this.parseWhatsapp(dto.whatsappNumber);
    if (dto.email !== undefined) {
      const email = dto.email ? dto.email.trim().toLowerCase() : null;
      if (email !== target.email) {
        data.email = email;
        // Only the account owner can prove control of an address.
        data.emailVerifiedAt = null;
      }
    }

    let user: StaffRow;
    try {
      user = await this.prisma.user.update({ where: { id }, data, select: STAFF_SELECT });
    } catch (err) {
      this.rethrowUnique(err);
    }

    await this.audit.record({
      actorUserId,
      action: 'STAFF_UPDATE',
      entityType: 'user',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });
    return this.serialize(user);
  }

  async changeRole(id: string, role: AssignableStaffRole, actorUserId: string) {
    if (id === actorUserId) {
      fail(ForbiddenException, 'CANNOT_CHANGE_OWN_ROLE', 'You cannot change your own role');
    }

    const user = await this.prisma.$transaction(
      async (tx) => {
        const target = await this.findStaff(id, tx);
        if (target.role === role) return target;
        if (target.role === UserRole.ADMIN && target.status === UserStatus.ACTIVE) {
          await this.assertAnotherActiveAdmin(tx, id);
        }
        return tx.user.update({ where: { id }, data: { role }, select: STAFF_SELECT });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit.record({
      actorUserId,
      action: 'STAFF_ROLE_CHANGE',
      entityType: 'user',
      entityId: id,
      metadata: { role },
    });
    return this.serialize(user);
  }

  async updateStatus(id: string, status: UserStatus, actorUserId: string) {
    if (status !== UserStatus.ACTIVE && status !== UserStatus.SUSPENDED) {
      fail(BadRequestException, 'VALIDATION_ERROR', 'Status must be ACTIVE or SUSPENDED');
    }
    if (id === actorUserId) {
      fail(ForbiddenException, 'CANNOT_CHANGE_OWN_STATUS', 'You cannot deactivate your own account');
    }

    const user = await this.prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findFirst({
          where: { id, deletedAt: null },
          select: STAFF_SELECT,
        });
        if (!target) fail(NotFoundException, 'USER_NOT_FOUND', 'User not found');
        if (
          status === UserStatus.SUSPENDED &&
          target.role === UserRole.ADMIN &&
          target.status === UserStatus.ACTIVE
        ) {
          await this.assertAnotherActiveAdmin(tx, id);
        }
        const updated = await tx.user.update({ where: { id }, data: { status }, select: STAFF_SELECT });
        if (status === UserStatus.SUSPENDED) await this.revokeSessions(tx, id, 'SUSPENDED');
        return updated;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );

    await this.audit.record({
      actorUserId,
      action: status === UserStatus.SUSPENDED ? 'USER_SUSPEND' : 'USER_REINSTATE',
      entityType: 'user',
      entityId: id,
      metadata: { status },
    });
    return this.serialize(user);
  }

  /** Admin fallback when a moderator has no verified email for self-service reset. */
  async resetModeratorPassword(id: string, dto: AdminResetPasswordDto, actorUserId: string) {
    if (id === actorUserId) {
      fail(ForbiddenException, 'USE_ACCOUNT_SETTINGS', 'Change your own password in Account Settings');
    }
    const target = await this.findStaff(id);
    if (target.role !== UserRole.MODERATOR) {
      fail(ForbiddenException, 'MODERATORS_ONLY', 'Only moderator passwords can be reset here');
    }

    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash } });
      await this.revokeSessions(tx, id, 'ADMIN_RESET');
      await tx.passwordResetToken.updateMany({
        where: { userId: id, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    await this.audit.record({
      actorUserId,
      action: 'STAFF_PASSWORD_RESET',
      entityType: 'user',
      entityId: id,
    });
    return { message: 'Password reset. The moderator must sign in again.' };
  }

  private async findStaff(id: string, tx: Tx = this.prisma): Promise<StaffRow> {
    const user = await tx.user.findFirst({ where: { id, deletedAt: null }, select: STAFF_SELECT });
    if (!user) fail(NotFoundException, 'USER_NOT_FOUND', 'User not found');
    if (!isStaffRole(user.role)) {
      fail(UnprocessableEntityException, 'NOT_STAFF_ACCOUNT', 'This is not a dashboard account');
    }
    return user;
  }

  private async assertAnotherActiveAdmin(tx: Tx, excludeId: string) {
    const others = await tx.user.count({
      where: {
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        deletedAt: null,
        id: { not: excludeId },
      },
    });
    if (others === 0) {
      fail(ConflictException, 'LAST_ADMIN', 'At least one active admin must remain');
    }
  }

  private async revokeSessions(tx: Tx, userId: string, reason = 'ADMIN_LOGOUT') {
    await tx.authSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }

  private parseWhatsapp(input: string): string {
    const whatsappNumber = normalizeWhatsapp(input);
    if (!isValidWhatsapp(whatsappNumber)) {
      fail(UnprocessableEntityException, 'VALIDATION_ERROR', WHATSAPP_INVALID_MESSAGE);
    }
    return whatsappNumber;
  }

  private rethrowUnique(err: unknown): never {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const target = String((err.meta as { target?: unknown } | undefined)?.target ?? '');
      if (target.includes('email')) {
        fail(ConflictException, 'EMAIL_EXISTS', 'Email already in use');
      }
      fail(ConflictException, 'WHATSAPP_EXISTS', 'WhatsApp number already registered');
    }
    throw err;
  }

  private serialize(user: StaffRow) {
    return {
      id: user.id,
      name: user.name,
      whatsappNumber: user.whatsappNumber,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      role: user.role,
      status: user.status,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
