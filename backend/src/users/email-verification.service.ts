import { Injectable, Logger, UnprocessableEntityException } from '@nestjs/common';
import { createErrorResponse } from '@your-academy/shared';
import { randomToken, sha256 } from '../common/utils/crypto';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { EmailQueueService } from '../queue/email-queue.service';

const DEFAULT_TTL_SECONDS = 24 * 60 * 60;

function verifyUrlBase(): string {
  if (process.env.EMAIL_VERIFICATION_URL_BASE) return process.env.EMAIL_VERIFICATION_URL_BASE;
  const origin = process.env.WEB_ORIGIN?.split(',')[0]?.trim() || 'http://localhost:3000';
  return `${origin.replace(/\/$/, '')}/verify-email`;
}

/**
 * Email ownership proof (DEC-048). Tokens are random, stored only as SHA-256,
 * single-use, time-limited, and bound to the exact address they were sent to —
 * changing the email again invalidates any outstanding link.
 */
@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  /** Send (or re-send) a confirmation link for the user's current, unverified email. */
  async sendForCurrentEmail(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, email: true, emailVerifiedAt: true },
    });
    if (!user.email) {
      throw new UnprocessableEntityException(
        createErrorResponse('EMAIL_REQUIRED', 'Add an email address first', newRequestId()),
      );
    }
    if (user.emailVerifiedAt) return { message: 'Email is already verified.' };

    const token = randomToken(32);
    const tokenHash = sha256(token);
    const ttl = Number(process.env.EMAIL_VERIFICATION_TTL_SECONDS ?? DEFAULT_TTL_SECONDS);
    await this.prisma.$transaction([
      this.prisma.emailVerificationToken.updateMany({
        where: { userId, usedAt: null },
        data: { usedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.create({
        data: { userId, email: user.email, tokenHash, expiresAt: new Date(Date.now() + ttl * 1000) },
      }),
    ]);

    const verifyUrl = `${verifyUrlBase()}?token=${token}`;
    try {
      await this.emailQueue.enqueueEmailVerification(
        { to: user.email, verifyUrl, userId, expiresInMinutes: Math.round(ttl / 60) },
        tokenHash.slice(0, 32),
      );
    } catch (err) {
      this.logger.error(`Failed to enqueue verification email: ${String(err)}`);
    }
    if (process.env.NODE_ENV !== 'production') {
      this.logger.log(`Email verification link for ${user.email}: ${verifyUrl}`);
    }
    return { message: `We sent a confirmation link to ${user.email}.` };
  }

  /** Invalidate outstanding links (e.g. after the email changes or is removed). */
  async invalidateOutstanding(userId: string): Promise<void> {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
  }

  async verify(token: string): Promise<{ message: string }> {
    const tokenHash = sha256(token);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.emailVerificationToken.updateMany({
        where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
        data: { usedAt: new Date() },
      });
      const record =
        claimed.count === 1
          ? await tx.emailVerificationToken.findUnique({ where: { tokenHash } })
          : null;
      const user = record
        ? await tx.user.findFirst({
            where: { id: record.userId, deletedAt: null },
            select: { id: true, email: true },
          })
        : null;
      if (!record || !user || user.email !== record.email) {
        throw new UnprocessableEntityException(
          createErrorResponse(
            'INVALID_TOKEN',
            'This confirmation link is invalid or has expired',
            newRequestId(),
          ),
        );
      }
      await tx.user.update({ where: { id: user.id }, data: { emailVerifiedAt: new Date() } });
    });
    return { message: 'Email verified.' };
  }
}
