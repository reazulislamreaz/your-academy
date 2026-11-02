import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { UserStatus } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
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
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-only-change-me-access-secret-32chars',
    });
  }

  async validate(payload: JwtPayload): Promise<RequestUser> {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE || user.deletedAt) {
      throw new UnauthorizedException(
        createErrorResponse('UNAUTHORIZED', 'Invalid session', newRequestId()),
      );
    }

    const session = await this.prisma.authSession.findUnique({ where: { id: payload.sid } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException(
        createErrorResponse('UNAUTHORIZED', 'Session expired', newRequestId()),
      );
    }

    return { userId: user.id, role: user.role, sessionId: session.id };
  }
}
