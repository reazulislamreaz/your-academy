import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  BrowsingSessionStatus,
  Prisma,
  QuestionStatus,
  UserRole,
  UserStatus,
  type User,
} from '@prisma/client';
import { createErrorResponse, isStaffRole } from '@your-academy/shared';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { randomToken, sha256 } from '../common/utils/crypto';
import {
  WHATSAPP_INVALID_MESSAGE,
  isValidWhatsapp,
  normalizeWhatsapp,
} from '../common/utils/whatsapp';
import { getJwtAccessSecret } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { LearningActivityService } from '../learning-activity/learning-activity.service';
import { EmailQueueService } from '../queue/email-queue.service';
import { AccessPolicyService } from '../billing/access-policy.service';
import type { JwtPayload, RequestUser } from './auth.types';
import { issuePasswordResetToken } from './password-reset-tokens';
import { SESSION_REPLACED_MESSAGE, lockUserSessions } from './session-lock';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

/** Device details recorded on each session for the admin "recent logins" view. */
export type ClientMeta = { userAgent?: string | null; ipAddress?: string | null };

/**
 * One device at a time (DEC-053): a new login revokes every other session of the
 * account. Applies to learners always; to Admin/Moderator only when SINGLE_SESSION_STAFF=true.
 */
export function singleSessionApplies(role: UserRole): boolean {
  if (process.env.SINGLE_SESSION_ENABLED === 'false') return false;
  if (isStaffRole(role)) return process.env.SINGLE_SESSION_STAFF === 'true';
  return true;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly access: AccessPolicyService,
    private readonly emailQueue: EmailQueueService,
    private readonly audit: AuditService,
    private readonly learningActivity: LearningActivityService,
  ) {}

  async register(dto: RegisterDto, meta: ClientMeta = {}) {
    const whatsappNumber = normalizeWhatsapp(dto.whatsappNumber);
    if (!isValidWhatsapp(whatsappNumber)) {
      throw new UnprocessableEntityException(
        createErrorResponse('VALIDATION_ERROR', WHATSAPP_INVALID_MESSAGE, newRequestId()),
      );
    }

    const existing = await this.prisma.user.findUnique({ where: { whatsappNumber } });
    if (existing) {
      throw new ConflictException(
        createErrorResponse('WHATSAPP_EXISTS', 'WhatsApp number already registered', newRequestId()),
      );
    }

    if (dto.email) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) {
        throw new ConflictException(
          createErrorResponse('EMAIL_EXISTS', 'Email already registered', newRequestId()),
        );
      }
    }

    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        whatsappNumber,
        email: dto.email?.trim().toLowerCase() || null,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
    });

    return this.issueSession(user, meta);
  }

  async login(dto: LoginDto, meta: ClientMeta = {}) {
    const whatsappNumber = normalizeWhatsapp(dto.whatsappNumber);
    // Same normalize path as register; invalid format still maps to generic credentials
    // so we do not leak whether a number is registered.
    if (!isValidWhatsapp(whatsappNumber)) {
      throw new UnauthorizedException(
        createErrorResponse('INVALID_CREDENTIALS', 'Invalid credentials', newRequestId()),
      );
    }
    const user = await this.prisma.user.findUnique({ where: { whatsappNumber } });
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        createErrorResponse('INVALID_CREDENTIALS', 'Invalid credentials', newRequestId()),
      );
    }

    const valid = await argon2.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException(
        createErrorResponse('INVALID_CREDENTIALS', 'Invalid credentials', newRequestId()),
      );
    }

    return this.issueSession(user, meta);
  }

  async refresh(refreshToken: string | undefined, meta: ClientMeta = {}) {
    if (!refreshToken) {
      throw new UnauthorizedException(
        createErrorResponse('UNAUTHORIZED', 'Missing refresh token', newRequestId()),
      );
    }

    const hash = sha256(refreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: hash },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException(
        createErrorResponse('UNAUTHORIZED', 'Invalid refresh token', newRequestId()),
      );
    }

    if (session.revokedAt) {
      // A device logged out by a newer login is not token theft — tell it why.
      if (session.revokedReason === 'REPLACED') {
        throw new UnauthorizedException(
          createErrorResponse('SESSION_REPLACED', SESSION_REPLACED_MESSAGE, newRequestId()),
        );
      }
      await this.prisma.authSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'TOKEN_REUSE' },
      });
      throw new UnauthorizedException(
        createErrorResponse('TOKEN_REUSE', 'Refresh token reuse detected', newRequestId()),
      );
    }

    if (session.expiresAt < new Date() || session.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        createErrorResponse('UNAUTHORIZED', 'Session expired', newRequestId()),
      );
    }

    const tokens = await this.rotateSession(session.user, session.id, session.familyId, meta);
    return { user: session.user, ...tokens };
  }

  async logout(user: RequestUser) {
    await this.prisma.$transaction([
      this.prisma.authSession.update({
        where: { id: user.sessionId },
        data: { revokedAt: new Date(), revokedReason: 'LOGOUT' },
      }),
      this.prisma.browsingSession.updateMany({
        where: { userId: user.userId, status: BrowsingSessionStatus.ACTIVE },
        data: { status: BrowsingSessionStatus.ENDED, endedAt: new Date() },
      }),
    ]);
    await this.learningActivity.record({
      userId: user.userId,
      type: 'LOGOUT',
    });
  }

  async changePassword(user: RequestUser, dto: ChangePasswordDto, meta: ClientMeta = {}) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const ok = await argon2.verify(dbUser.passwordHash, dto.currentPassword);
    if (!ok) {
      throw new UnauthorizedException(
        createErrorResponse('INVALID_CREDENTIALS', 'Current password is incorrect', newRequestId()),
      );
    }

    if (dbUser.mustChangePassword && (await argon2.verify(dbUser.passwordHash, dto.newPassword))) {
      throw new UnprocessableEntityException(
        createErrorResponse(
          'PASSWORD_REUSED',
          'Choose a new password that is different from the temporary one',
          newRequestId(),
        ),
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.userId },
        data: { passwordHash, mustChangePassword: false },
      }),
      this.prisma.authSession.updateMany({
        where: { userId: user.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'PASSWORD_CHANGE' },
      }),
    ]);

    await this.audit.record({
      actorUserId: user.userId,
      action: 'PASSWORD_CHANGE',
      entityType: 'user',
      entityId: user.userId,
    });

    return this.issueSession(await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } }), meta);
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    // Always generic success — no account enumeration
    const user = dto.email
      ? await this.prisma.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } })
      : dto.whatsappNumber
        ? await this.prisma.user.findUnique({
            where: { whatsappNumber: normalizeWhatsapp(dto.whatsappNumber) },
          })
        : null;

    // Dashboard staff may only reset through an address they have proven they control;
    // learners keep the legacy behaviour (any email on the account) — DEC-048.
    const email = user?.email;
    const emailUsable = Boolean(email && (!isStaffRole(user?.role) || user?.emailVerifiedAt));
    if (user && email && emailUsable && user.status === UserStatus.ACTIVE && !user.deletedAt) {
      const issued = await this.prisma.$transaction((tx) => issuePasswordResetToken(tx, user.id));
      try {
        await this.emailQueue.enqueuePasswordReset(
          { to: email, resetUrl: issued.resetUrl, userId: user.id, expiresInMinutes: issued.expiresInMinutes },
          issued.tokenHash.slice(0, 32),
        );
      } catch (err) {
        this.logger.error(`Failed to enqueue password reset email: ${String(err)}`);
      }
      // Local resets stay usable without a worker; never in production.
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`Password reset link for ${user.email}: ${issued.resetUrl}`);
      }
    }

    return { message: 'If an account exists, reset instructions were sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = sha256(dto.token);
    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });

    const result = await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new UnprocessableEntityException(
          createErrorResponse('INVALID_TOKEN', 'Reset token is invalid or expired', newRequestId()),
        );
      }

      const record = await tx.passwordResetToken.findUniqueOrThrow({
        where: { tokenHash },
        include: { user: { select: { email: true, emailVerifiedAt: true } } },
      });
      // An admin-sent link proves the user controls the inbox it was sent to — but only
      // if that address is still the account's email.
      const verifiesEmail =
        record.verifiesEmail !== null &&
        record.user.email === record.verifiesEmail &&
        !record.user.emailVerifiedAt;
      await tx.user.update({
        where: { id: record.userId },
        data: {
          passwordHash,
          mustChangePassword: false,
          ...(verifiesEmail ? { emailVerifiedAt: new Date() } : {}),
        },
      });
      await tx.authSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'PASSWORD_RESET' },
      });
      return { userId: record.userId, adminAssisted: record.verifiesEmail !== null };
    });

    await this.audit.record({
      actorUserId: result.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      entityType: 'user',
      entityId: result.userId,
      metadata: { via: 'reset_link' },
    });

    return { message: 'Password updated. Please sign in.' };
  }

  async toPublicUser(user: User) {
    const access = await this.access.snapshot(user.id);
    const withStudy = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: {
        lastQuestion: {
          select: {
            id: true,
            title: true,
            deletedAt: true,
            status: true,
            category: { select: { id: true, name: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
    });
    const row = withStudy ?? user;
    const lastQuestion =
      withStudy?.lastQuestion &&
      !withStudy.lastQuestion.deletedAt &&
      withStudy.lastQuestion.status === QuestionStatus.PUBLISHED
        ? {
            id: withStudy.lastQuestion.id,
            title: withStudy.lastQuestion.title,
            categoryId: withStudy.lastQuestion.category.id,
            categoryName: withStudy.lastQuestion.subcategory
              ? `${withStudy.lastQuestion.category.name} · ${withStudy.lastQuestion.subcategory.name}`
              : withStudy.lastQuestion.category.name,
            filterQs: withStudy.lastQuestionFilterQs ?? undefined,
          }
        : null;

    return {
      id: row.id,
      name: row.name,
      whatsappNumber: row.whatsappNumber,
      email: row.email,
      emailVerified: Boolean(row.emailVerifiedAt),
      mustChangePassword: row.mustChangePassword,
      role: row.role,
      status: row.status,
      access,
      study: {
        preferredCategoryIds: withStudy?.preferredCategoryIds ?? [],
        onboardingCompleted: Boolean(withStudy?.onboardingCompletedAt),
        onboardingCompletedAt: withStudy?.onboardingCompletedAt?.toISOString() ?? null,
        lastQuestion,
      },
    };
  }

  private async issueSession(user: User, meta: ClientMeta = {}) {
    const familyId = randomUUID();
    const tokens = await this.prisma.$transaction(async (tx) => {
      // Serialise logins/refreshes per user so two near-simultaneous logins can't both
      // survive: the later one (by lock order) revokes the earlier one.
      await lockUserSessions(tx, user.id);
      if (singleSessionApplies(user.role)) {
        await tx.authSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: 'REPLACED' },
        });
      }
      return this.createSessionTokens(user, familyId, tx, meta);
    });
    await this.learningActivity.record({
      userId: user.id,
      type: 'LOGIN',
    });
    return { user, ...tokens };
  }

  private async rotateSession(user: User, oldSessionId: string, familyId: string, meta: ClientMeta) {
    return this.prisma.$transaction(async (tx) => {
      await lockUserSessions(tx, user.id);
      const tokens = await this.createSessionTokens(user, familyId, tx, meta);
      const rotated = await tx.authSession.updateMany({
        where: { id: oldSessionId, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'ROTATED', replacedBySessionId: tokens.sessionId },
      });
      if (rotated.count !== 1) {
        const old = await tx.authSession.findUnique({
          where: { id: oldSessionId },
          select: { revokedReason: true },
        });
        // A newer login on another device won the lock first: discard our new row.
        if (old?.revokedReason === 'REPLACED') {
          await tx.authSession.update({
            where: { id: tokens.sessionId },
            data: { revokedAt: new Date(), revokedReason: 'REPLACED' },
          });
          return { replaced: true as const };
        }
        // Concurrent refresh already consumed this token — treat as reuse.
        await tx.authSession.updateMany({
          where: { familyId, revokedAt: null },
          data: { revokedAt: new Date(), revokedReason: 'TOKEN_REUSE' },
        });
        return { reuse: true as const };
      }
      return tokens;
    }).then((result) => {
      if ('replaced' in result) {
        throw new UnauthorizedException(
          createErrorResponse('SESSION_REPLACED', SESSION_REPLACED_MESSAGE, newRequestId()),
        );
      }
      if ('reuse' in result) {
        throw new UnauthorizedException(
          createErrorResponse('TOKEN_REUSE', 'Refresh token reuse detected', newRequestId()),
        );
      }
      return result;
    });
  }

  private async createSessionTokens(
    user: User,
    familyId: string,
    db: Prisma.TransactionClient | PrismaService = this.prisma,
    meta: ClientMeta = {},
  ) {
    const refreshToken = randomToken(48);
    const refreshTtl = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000);
    const accessTtl = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900);

    const session = await db.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: sha256(refreshToken),
        familyId,
        userAgent: meta.userAgent?.slice(0, 512) ?? null,
        ipAddress: meta.ipAddress?.slice(0, 64) ?? null,
        expiresAt: new Date(Date.now() + refreshTtl * 1000),
      },
    });

    const payload: JwtPayload = { sub: user.id, role: user.role, sid: session.id };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: getJwtAccessSecret(),
      expiresIn: accessTtl,
    });

    return {
      accessToken,
      refreshToken,
      csrfToken: randomToken(24),
      sessionId: session.id,
    };
  }
}
