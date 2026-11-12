import { UnauthorizedException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { Request } from 'express';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import type { SupportGuestService } from './support-guest.service';
import type { SupportActor } from './support.types';

export async function resolveSupportActor(
  req: Request & { user?: RequestUser },
  guests: SupportGuestService,
): Promise<SupportActor> {
  if (req.user?.userId) {
    return {
      kind: 'user',
      userId: req.user.userId,
      role: req.user.role,
      sessionId: req.user.sessionId,
    };
  }
  const guest = await guests.resolveFromRequest(req);
  if (guest) return guest;
  throw new UnauthorizedException(
    createErrorResponse('UNAUTHORIZED', 'Sign in or start a guest support session', newRequestId()),
  );
}

export function isAdminActor(actor: SupportActor): boolean {
  return actor.kind === 'user' && actor.role === UserRole.ADMIN;
}
