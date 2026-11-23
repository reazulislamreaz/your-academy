import { SetMetadata } from '@nestjs/common';
import type { DashboardPermission } from '@your-academy/shared';

export const PERMISSION_KEY = 'requiredPermission';

/**
 * Dashboard RBAC (DEC-048). The caller's role must grant this permission in
 * `ROLE_PERMISSIONS` (`@your-academy/shared`). Use with `PermissionsGuard`.
 * A method-level decorator overrides the controller-level one.
 */
export const RequirePermission = (permission: DashboardPermission) =>
  SetMetadata(PERMISSION_KEY, permission);
