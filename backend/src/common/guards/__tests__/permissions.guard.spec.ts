import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import type { DashboardPermission } from '@your-academy/shared';
import { PermissionsGuard } from '../permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = { getAllAndOverride: jest.fn() };
  const guard = new PermissionsGuard(reflector as unknown as Reflector);

  function context(user?: { userId: string; role: UserRole }) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({ getRequest: () => ({ user }) }),
    } as never;
  }

  function require(permission: DashboardPermission | undefined) {
    reflector.getAllAndOverride.mockReturnValue(permission);
  }

  const admin = { userId: 'a1', role: UserRole.ADMIN };
  const moderator = { userId: 'm1', role: UserRole.MODERATOR };
  const learner = { userId: 'u1', role: UserRole.USER };

  beforeEach(() => jest.resetAllMocks());

  it.each(['preli', 'written', 'topic', 'quiz', 'modelTest', 'newspaper', 'categories'] as const)(
    'lets moderators into the %s section',
    (permission) => {
      require(permission);
      expect(guard.canActivate(context(moderator))).toBe(true);
    },
  );

  it.each(['users', 'dashboard', 'activity', 'audit', 'examResults', 'homepage', 'settings', 'support'] as const)(
    'returns 403 to moderators for admin-only %s',
    (permission) => {
      require(permission);
      expect(() => guard.canActivate(context(moderator))).toThrow(ForbiddenException);
    },
  );

  it('allows admins on every permission', () => {
    require('users');
    expect(guard.canActivate(context(admin))).toBe(true);
    require('preli');
    expect(guard.canActivate(context(admin))).toBe(true);
  });

  it('forbids learners on staff permissions', () => {
    require('preli');
    expect(() => guard.canActivate(context(learner))).toThrow(ForbiddenException);
  });

  it('fails closed when a route has no permission metadata', () => {
    require(undefined);
    expect(() => guard.canActivate(context(admin))).toThrow(ForbiddenException);
  });

  it('forbids when no authenticated user is attached', () => {
    require('preli');
    expect(() => guard.canActivate(context(undefined))).toThrow(ForbiddenException);
  });
});
