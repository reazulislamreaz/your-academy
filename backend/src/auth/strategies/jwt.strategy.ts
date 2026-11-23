import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { Request } from 'express';
import { Strategy } from 'passport-jwt';
import { getJwtAccessSecret } from '../../config/env';
import { PrismaService } from '../../database/prisma.service';
import { newRequestId } from '../../common/request-id';
import { cookieOrBearerExtractor } from '../access-token';
import type { JwtPayload, RequestUser } from '../auth.types';
import { SESSION_REPLACED_MESSAGE } from '../session-lock';

/**
 * Routes a user holding an Admin-issued temporary password may still call:
 * enough to load the account, change the password, check the session, or sign out.
 */
const PASSWORD_CHANGE_ALLOWED = new Set([
  'GET /api/v1/users/me',
  'GET /api/v1/auth/session',
  'POST /api/v1/auth/change-password',
  'POST /api/v1/auth/logout',
]);

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: getJwtAccessSecret(),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<RequestUser> {
    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true, deletedAt: true, mustChangePassword: true },
      }),
      this.prisma.authSession.findUnique({
        where: { id: payload.sid },
        select: { id: true, userId: true, revokedAt: true, revokedReason: true, expiresAt: true },
      }),
    ]);

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new UnauthorizedException(
        createErrorResponse('UNAUTHORIZED', 'Invalid session', newRequestId()),
      );
    }

    if (session?.revokedAt && session.revokedReason === 'REPLACED' && session.userId === user.id) {
      throw new UnauthorizedException(
        createErrorResponse('SESSION_REPLACED', SESSION_REPLACED_MESSAGE, newRequestId()),
      );
    }

    if (
      !session ||
      session.userId !== user.id ||
      session.revokedAt ||
      session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException(
        createErrorResponse('UNAUTHORIZED', 'Session expired', newRequestId()),
      );
    }

    if (user.mustChangePassword) {
      const path = (req.originalUrl ?? req.url ?? '').split('?')[0].replace(/\/$/, '');
      if (!PASSWORD_CHANGE_ALLOWED.has(`${req.method} ${path}`)) {
        throw new ForbiddenException(
          createErrorResponse(
            'PASSWORD_CHANGE_REQUIRED',
            'Set a new password to continue',
            newRequestId(),
          ),
        );
      }
    }

    return { userId: user.id, role: user.role, sessionId: session.id };
  }
}
