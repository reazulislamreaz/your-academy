import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getJwtAccessSecret } from '../../config/env';
import { PrismaService } from '../../database/prisma.service';
import { newRequestId } from '../../common/request-id';
import type { JwtPayload, RequestUser } from '../auth.types';

function cookieOrBearerExtractor(req: Request): string | null {
  const fromHeader = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (fromHeader) return fromHeader;
  const name = process.env.ACCESS_COOKIE_NAME ?? 'access_token';
  return req?.cookies?.[name] ?? null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(private readonly prisma: PrismaService) {
    super({
      jwtFromRequest: cookieOrBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: getJwtAccessSecret(),
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, role: true, status: true, deletedAt: true },
      }),
      this.prisma.authSession.findUnique({
        where: { id: payload.sid },
        select: { id: true, userId: true, revokedAt: true, expiresAt: true },
      }),
    ]);

    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new UnauthorizedException(
        createErrorResponse('UNAUTHORIZED', 'Invalid session', newRequestId()),
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

    return { userId: user.id, role: user.role, sessionId: session.id };
  }
}
