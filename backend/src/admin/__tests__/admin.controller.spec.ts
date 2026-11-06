import { ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

// The controller imports JwtAuthGuard, which pulls in @nestjs/passport (ESM)
// — mock the guards so the spec can load the real controller class.
jest.mock('../../common/guards/jwt-auth.guard', () => ({ JwtAuthGuard: class MockGuard {} }));
jest.mock('../../common/guards/roles.guard', () => ({ RolesGuard: class MockGuard {} }));
jest.mock('../../common/guards/csrf.guard', () => ({ CsrfGuard: class MockGuard {} }));

import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { AdminController } from '../admin.controller';

// The mock above replaces RolesGuard for the controller's import; the tests
// below need the real guard, so load it bypassing the mock.
const { RolesGuard } = jest.requireActual<{
  RolesGuard: new (
    reflector: Reflector,
  ) => { canActivate: (context: never) => boolean };
}>('../../common/guards/roles.guard');

/**
 * The role/trial endpoints live on AdminController, which is gated at the
 * class level by @Roles(ADMIN) + JwtAuthGuard + RolesGuard. These tests pin
 * that gate: the metadata must require ADMIN, and the guard must deny a
 * plain USER (403) for any handler on the controller.
 */
describe('AdminController admin-only gate (role + trial endpoints)', () => {
  it('requires ADMIN on the controller class', () => {
    const reflector = new Reflector();
    const roles = reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [AdminController]);
    expect(roles).toEqual([UserRole.ADMIN]);
  });

  it('the role and trial handlers exist on the gated controller', () => {
    expect(typeof AdminController.prototype.updateUserRole).toBe('function');
    expect(typeof AdminController.prototype.extendTrial).toBe('function');
  });

  function guardContext(handler: (...args: never[]) => unknown, role: UserRole) {
    return {
      getHandler: () => handler,
      getClass: () => AdminController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { userId: 'u9', role, sessionId: 's9' } }),
      }),
    } as never;
  }

  it('RolesGuard denies a non-admin caller (403) on the role endpoint', () => {
    const guard = new RolesGuard(new Reflector());
    expect(() =>
      guard.canActivate(
        guardContext(AdminController.prototype.updateUserRole, UserRole.USER),
      ),
    ).toThrow(ForbiddenException);
  });

  it('RolesGuard denies a non-admin caller (403) on the trial endpoint', () => {
    const guard = new RolesGuard(new Reflector());
    expect(() =>
      guard.canActivate(guardContext(AdminController.prototype.extendTrial, UserRole.USER)),
    ).toThrow(ForbiddenException);
  });

  it('RolesGuard allows an admin caller', () => {
    const guard = new RolesGuard(new Reflector());
    expect(
      guard.canActivate(
        guardContext(AdminController.prototype.updateUserRole, UserRole.ADMIN),
      ),
    ).toBe(true);
  });
});
