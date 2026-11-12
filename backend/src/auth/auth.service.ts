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
  QuestionStatus,
  UserRole,
  UserStatus,
  type User,
} from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import * as argon2 from 'argon2';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { randomToken, sha256 } from '../common/utils/crypto';
import { isValidWhatsapp, normalizeWhatsapp } from '../common/utils/whatsapp';
import { getJwtAccessSecret } from '../config/env';
import { PrismaService } from '../database/prisma.service';
import { LearningActivityService } from '../learning-activity/learning-activity.service';
import { EmailQueueService } from '../queue/email-queue.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import type { JwtPayload, RequestUser } from './auth.types';
import type { ChangePasswordDto } from './dto/change-password.dto';
import type { ForgotPasswordDto } from './dto/forgot-password.dto';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import type { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly access: AccessControlService,
    private readonly emailQueue: EmailQueueService,
    private readonly audit: AuditService,
    private readonly learningActivity: LearningActivityService,
  ) {}

  async register(dto: RegisterDto) {
    const whatsappNumber = normalizeWhatsapp(dto.whatsappNumber);
    if (!isValidWhatsapp(whatsappNumber)) {
      throw new UnprocessableEntityException(
        createErrorResponse('VALIDATION_ERROR', 'Invalid WhatsApp number', newRequestId()),
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

    const trialDays = Number(process.env.TRIAL_DAYS ?? 7);
    const trialStartedAt = new Date();
    const trialEndsAt = new Date(trialStartedAt.getTime() + trialDays * 24 * 60 * 60 * 1000);
    const passwordHash = await argon2.hash(dto.password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        whatsappNumber,
        email: dto.email?.trim().toLowerCase() || null,
        passwordHash,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
        trialStartedAt,
        trialEndsAt,
      },
    });

    return this.issueSession(user);
  }

  async login(dto: LoginDto) {
    const whatsappNumber = normalizeWhatsapp(dto.whatsappNumber);
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

    return this.issueSession(user);
  }

  async refresh(refreshToken: string | undefined) {
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
      await this.prisma.authSession.updateMany({
        where: { familyId: session.familyId, revokedAt: null },
        data: { revokedAt: new Date() },
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

    const tokens = await this.rotateSession(session.user, session.id, session.familyId);
    return { user: session.user, ...tokens };
  }

  async logout(user: RequestUser) {
    await this.prisma.authSession.update({
      where: { id: user.sessionId },
      data: { revokedAt: new Date() },
    });
    await this.prisma.browsingSession.updateMany({
      where: { userId: user.userId, status: BrowsingSessionStatus.ACTIVE },
      data: { status: BrowsingSessionStatus.ENDED, endedAt: new Date() },
    });
    await this.learningActivity.record({
      userId: user.userId,
      type: 'LOGOUT',
    });
  }

  async changePassword(user: RequestUser, dto: ChangePasswordDto) {
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const ok = await argon2.verify(dbUser.passwordHash, dto.currentPassword);
    if (!ok) {
      throw new UnauthorizedException(
        createErrorResponse('INVALID_CREDENTIALS', 'Current password is incorrect', newRequestId()),
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.userId }, data: { passwordHash } }),
      this.prisma.authSession.updateMany({
        where: { userId: user.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      actorUserId: user.userId,
      action: 'PASSWORD_CHANGE',
      entityType: 'user',
      entityId: user.userId,
    });

    return this.issueSession(await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } }));
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

    if (user?.email && user.status === UserStatus.ACTIVE && !user.deletedAt) {
      const token = randomToken(32);
      const ttl = Number(process.env.PASSWORD_RESET_TTL_SECONDS ?? 3600);
      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash: sha256(token),
          expiresAt: new Date(Date.now() + ttl * 1000),
        },
      });
      const base = process.env.PASSWORD_RESET_URL_BASE ?? 'http://localhost:3000/reset-password';
      const resetUrl = `${base}?token=${token}`;
      try {
        await this.emailQueue.enqueuePasswordReset(
          { to: user.email, resetUrl, userId: user.id },
          sha256(token).slice(0, 32),
        );
      } catch (err) {
        this.logger.error(`Failed to enqueue password reset email: ${String(err)}`);
        // Still log in non-production so local resets remain usable without worker.
        if (process.env.NODE_ENV !== 'production') {
          this.logger.log(`Password reset link for ${user.email}: ${resetUrl}`);
        }
      }
      if (process.env.NODE_ENV !== 'production') {
        this.logger.log(`Password reset link for ${user.email}: ${resetUrl}`);
      }
    }

    return { message: 'If an account exists, reset instructions were sent.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = sha256(dto.token);
    const record = await this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new UnprocessableEntityException(
        createErrorResponse('INVALID_TOKEN', 'Reset token is invalid or expired', newRequestId()),
      );
    }

    const passwordHash = await argon2.hash(dto.newPassword, { type: argon2.argon2id });
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.authSession.updateMany({
        where: { userId: record.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    return { message: 'Password updated. Please sign in.' };
  }

  async toPublicUser(user: User) {
    const access = await this.access.getAccessSnapshot(user);
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

  private async issueSession(user: User) {
    const familyId = randomUUID();
    const tokens = await this.createSessionTokens(user, familyId);
    await this.learningActivity.record({
      userId: user.id,
      type: 'LOGIN',
    });
    return { user, ...tokens };
  }

  private async rotateSession(user: User, oldSessionId: string, familyId: string) {
    const tokens = await this.createSessionTokens(user, familyId);
    await this.prisma.authSession.update({
      where: { id: oldSessionId },
      data: { revokedAt: new Date(), replacedBySessionId: tokens.sessionId },
    });
    return tokens;
  }

  private async createSessionTokens(user: User, familyId: string) {
    const refreshToken = randomToken(48);
    const refreshTtl = Number(process.env.JWT_REFRESH_TTL_SECONDS ?? 2592000);
    const accessTtl = Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900);

    const session = await this.prisma.authSession.create({
      data: {
        userId: user.id,
        refreshTokenHash: sha256(refreshToken),
        familyId,
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
