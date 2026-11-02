import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };
  const guard = new RolesGuard(reflector as unknown as Reflector);

  function context(user?: { userId: string; role: UserRole }) {
    return {
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as never;
  }

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('allows when no roles metadata', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context({ userId: 'u1', role: UserRole.USER }))).toBe(true);
  });

  it('allows admin for ADMIN-required routes', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(guard.canActivate(context({ userId: 'a1', role: UserRole.ADMIN }))).toBe(true);
  });

  it('forbids non-admin on ADMIN-required routes', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    expect(() => guard.canActivate(context({ userId: 'u1', role: UserRole.USER }))).toThrow(
      ForbiddenException,
    );
  });
});
