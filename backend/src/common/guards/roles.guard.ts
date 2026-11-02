import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../../auth/auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { newRequestId } from '../request-id';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const { user } = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException(
        createErrorResponse('FORBIDDEN', 'Insufficient permissions', newRequestId()),
      );
    }
    return true;
  }
}
