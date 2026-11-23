import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createErrorResponse, hasPermission, type DashboardPermission } from '@your-academy/shared';
import type { RequestUser } from '../../auth/auth.types';
import { PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { newRequestId } from '../request-id';

/**
 * Enforces `@RequirePermission` against the central role → permission map.
 * Runs after `JwtAuthGuard`, whose strategy reloads the role from the database
 * on every request, so role changes and deactivation apply immediately.
 * Fails closed: a route using this guard without a permission is denied.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<DashboardPermission | undefined>(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );
    const { user } = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    if (!permission || !user || !hasPermission(user.role, permission)) {
      throw new ForbiddenException(
        createErrorResponse('FORBIDDEN', 'Insufficient permissions', newRequestId()),
      );
    }
    return true;
  }
}
