import {
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import * as argon2 from 'argon2';
import { randomInt } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { issuePasswordResetToken } from '../auth/password-reset-tokens';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { EmailQueueService } from '../queue/email-queue.service';
import { maskEmailForNotice } from './mask-email';

export const ADMIN_RESET_ACTIONS = {
  email: 'ADMIN_PASSWORD_RESET_EMAIL',
  link: 'ADMIN_PASSWORD_RESET_LINK',
  temporary: 'ADMIN_PASSWORD_RESET_TEMPORARY',
} as const;

/** Every action that belongs in a user's password-reset history. */
const HISTORY_ACTIONS = [
  ...Object.values(ADMIN_RESET_ACTIONS),
  'STAFF_PASSWORD_RESET',
  'PASSWORD_RESET_COMPLETED',
  'PASSWORD_CHANGE',
];

const RATE_WINDOW_MS = 15 * 60 * 1000;

function rateLimitPerUser(): number {
  return Number(process.env.ADMIN_RESET_LIMIT_PER_USER ?? 5);
}

function fail(Exc: new (body: unknown) => HttpException, code: string, message: string): never {
  throw new Exc(createErrorResponse(code, message, newRequestId()));
}

const TARGET_SELECT = {
  id: true,
  name: true,
  whatsappNumber: true,
  email: true,
  emailVerifiedAt: true,
  role: true,
  status: true,
} satisfies Prisma.UserSelect;

type Target = Prisma.UserGetPayload<{ select: typeof TARGET_SELECT }>;

/** Readable but strong: no 0/O/1/l/I, always a letter and a digit (password policy). */
export function generateTemporaryPassword(length = 12): string {
  const letters = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const digits = '23456789';
  const all = letters + digits;
  const chars = [letters[randomInt(letters.length)], digits[randomInt(digits.length)]];
  while (chars.length < length) chars.push(all[randomInt(all.length)]);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

/**
 * Admin-assisted password reset for users who cannot use self-service email reset.
 * Reuses the single reset-token system (`issuePasswordResetToken`) and the standard
 * reset email. Admin-only via the `users` permission on the controller.
 */
@Injectable()
export class AdminPasswordResetService {
  private readonly logger = new Logger(AdminPasswordResetService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  /** Option A — set/confirm the email, then send the standard reset email to it. */
  async sendByEmail(id: string, requestedEmail: string | undefined, actorUserId: string, ip?: string) {
    const target = await this.loadTarget(id, actorUserId);
    await this.assertWithinRateLimit(id);

    const nextEmail = (requestedEmail ?? target.email ?? '').trim().toLowerCase();
    if (!nextEmail) {
      fail(UnprocessableEntityException, 'EMAIL_REQUIRED', 'Add an email address for this user first');
    }
    const previousEmail = target.email;
    const emailChanged = previousEmail !== nextEmail;

    if (emailChanged) {
      const taken = await this.prisma.user.findFirst({
        where: { email: nextEmail, id: { not: id } },
        select: { id: true },
      });
      if (taken) fail(ConflictException, 'EMAIL_EXISTS', 'This email is already used by another account');
    }

    let issued;
    try {
      issued = await this.prisma.$transaction(async (tx) => {
        if (emailChanged) {
          await tx.user.update({ where: { id }, data: { email: nextEmail, emailVerifiedAt: null } });
          await tx.emailVerificationToken.updateMany({
            where: { userId: id, usedAt: null },
            data: { usedAt: new Date() },
          });
        }
        return issuePasswordResetToken(tx, id, { verifiesEmail: nextEmail });
      });
    } catch (err) {
      // Lost a race with another account claiming the same address.
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        fail(ConflictException, 'EMAIL_EXISTS', 'This email is already used by another account');
      }
      throw err;
    }

    await this.emailQueue.enqueuePasswordReset(
      { to: nextEmail, resetUrl: issued.resetUrl, userId: id, expiresInMinutes: issued.expiresInMinutes },
      issued.tokenHash.slice(0, 32),
    );
    if (emailChanged && previousEmail) {
      await this.emailQueue.enqueueEmailChangedNotice(
        { to: previousEmail, newEmailMasked: maskEmailForNotice(nextEmail), userId: id, changedBy: 'admin' },
        issued.tokenHash.slice(0, 32),
      );
    }

    await this.audit.record({
      actorUserId,
      action: ADMIN_RESET_ACTIONS.email,
      entityType: 'user',
      entityId: id,
      ipAddress: ip ?? null,
      metadata: {
        option: 'email',
        email: nextEmail,
        ...(emailChanged ? { previousEmail: previousEmail ?? null } : {}),
      },
    });

    return { email: nextEmail, emailChanged, expiresAt: issued.expiresAt.toISOString() };
  }

  /** Option B — a reset link the Admin shares over WhatsApp. Returned once, never stored. */
  async createShareableLink(id: string, actorUserId: string, ip?: string) {
    const target = await this.loadTarget(id, actorUserId);
    await this.assertWithinRateLimit(id);

    const issued = await this.prisma.$transaction((tx) => issuePasswordResetToken(tx, id));

    await this.audit.record({
      actorUserId,
      action: ADMIN_RESET_ACTIONS.link,
      entityType: 'user',
      entityId: id,
      ipAddress: ip ?? null,
      metadata: { option: 'whatsapp_link' },
    });

    return {
      resetUrl: issued.resetUrl,
      expiresAt: issued.expiresAt.toISOString(),
      whatsappNumber: target.whatsappNumber,
      name: target.name,
    };
  }

  /** Option C — temporary password; the user must choose a new one at next sign-in. */
  async setTemporaryPassword(id: string, typed: string | undefined, actorUserId: string, ip?: string) {
    await this.loadTarget(id, actorUserId);
    await this.assertWithinRateLimit(id);

    const generated = !typed;
    const temporaryPassword = typed ?? generateTemporaryPassword();
    const passwordHash = await argon2.hash(temporaryPassword, { type: argon2.argon2id });

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data: { passwordHash, mustChangePassword: true } });
      await tx.authSession.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date(), revokedReason: 'ADMIN_RESET' },
      });
      await tx.passwordResetToken.updateMany({
        where: { userId: id, usedAt: null },
        data: { usedAt: new Date() },
      });
    });

    await this.audit.record({
      actorUserId,
      action: ADMIN_RESET_ACTIONS.temporary,
      entityType: 'user',
      entityId: id,
      ipAddress: ip ?? null,
      metadata: { option: 'temporary_password', generated },
    });

    // The plain password goes back to the Admin's browser once and nowhere else.
    return { temporaryPassword: generated ? temporaryPassword : null, generated };
  }

  async history(id: string, limit = 20) {
    const rows = await this.prisma.auditLog.findMany({
      where: { entityType: 'user', entityId: id, action: { in: HISTORY_ACTIONS } },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 50),
      select: {
        id: true,
        action: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, name: true, role: true } },
      },
    });
    return rows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, unknown>;
      return {
        id: r.id,
        action: r.action,
        option: typeof meta.option === 'string' ? meta.option : null,
        email: typeof meta.email === 'string' ? meta.email : null,
        actor: r.actor,
        createdAt: r.createdAt.toISOString(),
      };
    });
  }

  private async loadTarget(id: string, actorUserId: string): Promise<Target> {
    if (id === actorUserId) {
      fail(ForbiddenException, 'USE_ACCOUNT_SETTINGS', 'Change your own password in Account Settings');
    }
    const target = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, select: TARGET_SELECT });
    if (!target) fail(NotFoundException, 'USER_NOT_FOUND', 'User not found');
    if (target.role === UserRole.ADMIN) {
      fail(ForbiddenException, 'ADMIN_TARGET_FORBIDDEN', 'Admin passwords cannot be reset here');
    }
    if (target.status !== UserStatus.ACTIVE) {
      fail(UnprocessableEntityException, 'USER_NOT_ACTIVE', 'Reinstate this account before resetting its password');
    }
    return target;
  }

  private async assertWithinRateLimit(id: string): Promise<void> {
    const recent = await this.prisma.auditLog.count({
      where: {
        entityType: 'user',
        entityId: id,
        action: { in: Object.values(ADMIN_RESET_ACTIONS) },
        createdAt: { gte: new Date(Date.now() - RATE_WINDOW_MS) },
      },
    });
    if (recent >= rateLimitPerUser()) {
      this.logger.warn(`Admin reset rate limit hit for user ${id}`);
      throw new HttpException(
        createErrorResponse(
          'RESET_RATE_LIMITED',
          'Too many resets for this user. Try again in 15 minutes.',
          newRequestId(),
        ),
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
