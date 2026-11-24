jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { AuthService } from '../auth.service';

describe('AuthService hardening paths', () => {
  const prisma: {
    user: { findUnique: jest.Mock; create: jest.Mock };
    authSession: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    browsingSession: { updateMany: jest.Mock };
    passwordResetToken: {
      updateMany: jest.Mock;
      create: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
  } = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    authSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    browsingSession: {
      updateMany: jest.fn(),
    },
    passwordResetToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  prisma.$transaction.mockImplementation(async (arg: unknown) => {
    if (typeof arg === 'function') {
      return (arg as (tx: typeof prisma) => Promise<unknown>)(prisma);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg;
  });
  const jwt = { signAsync: jest.fn().mockResolvedValue('access.jwt') };
  const access = { snapshot: jest.fn() };
  const emailQueue = { enqueuePasswordReset: jest.fn() };
  const audit = { record: jest.fn() };
  const learningActivity = { record: jest.fn() };

  const service = new AuthService(
    prisma as never,
    jwt as never,
    access as never,
    emailQueue as never,
    audit as never,
    learningActivity as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    jwt.signAsync.mockResolvedValue('access.jwt');
  });

  it('registers a free learner (no trial / subscription fields written)', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const created = {
      id: 'u1',
      name: 'Learner',
      whatsappNumber: '+8801711111111',
      email: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      passwordHash: 'hash',
    };
    prisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      expect(data).not.toHaveProperty('trialStartedAt');
      expect(data).not.toHaveProperty('trialEndsAt');
      return { ...created, ...data, passwordHash: 'hash' };
    });
    prisma.authSession.create.mockResolvedValue({
      id: 'sess-1',
      familyId: 'fam-1',
    });

    await service.register({
      name: 'Learner',
      whatsappNumber: '+8801711111111',
      password: 'Password123!',
    });

    expect(prisma.user.create).toHaveBeenCalled();
  });

  it('rejects suspended users on login', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      whatsappNumber: '+8801711111111',
      status: UserStatus.SUSPENDED,
      deletedAt: null,
      passwordHash: 'x',
    });

    await expect(
      service.login({ whatsappNumber: '+8801711111111', password: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes refresh family on reuse detection', async () => {
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'sess-old',
      familyId: 'fam-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u1', status: UserStatus.ACTIVE },
    });
    prisma.authSession.updateMany.mockResolvedValue({ count: 2 });

    await expect(service.refresh('stale-refresh-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
      where: { familyId: 'fam-1', revokedAt: null },
      data: { revokedAt: expect.any(Date), revokedReason: 'TOKEN_REUSE' },
    });
  });

  it('answers SESSION_REPLACED (not reuse) for a device logged out by a newer login', async () => {
    prisma.authSession.findUnique.mockResolvedValue({
      id: 'sess-old',
      familyId: 'fam-1',
      revokedAt: new Date(),
      revokedReason: 'REPLACED',
      expiresAt: new Date(Date.now() + 60_000),
      user: { id: 'u1', status: UserStatus.ACTIVE },
    });
    const err = await service.refresh('old-device-token').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(JSON.stringify((err as UnauthorizedException).getResponse())).toContain('SESSION_REPLACED');
    // The new device's family must survive.
    expect(prisma.authSession.updateMany).not.toHaveBeenCalled();
  });

  describe('single active session (one device per account)', () => {
    const learner = {
      id: 'u1',
      whatsappNumber: '+8801711111111',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      passwordHash: 'hash',
    };

    beforeAll(async () => {
      learner.passwordHash = await argon2.hash('Password123', { type: argon2.argon2id });
    });

    beforeEach(() => {
      delete process.env.SINGLE_SESSION_STAFF;
      delete process.env.SINGLE_SESSION_ENABLED;
      prisma.authSession.create.mockResolvedValue({ id: 'sess-new', familyId: 'fam-new' });
    });

    it('revokes every other session as REPLACED under a per-user lock on login', async () => {
      prisma.user.findUnique.mockResolvedValue(learner);
      await service.login(
        { whatsappNumber: '+8801711111111', password: 'Password123' },
        { userAgent: 'Firefox', ipAddress: '203.0.113.9' },
      );
      expect(prisma.$queryRaw).toHaveBeenCalled();
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date), revokedReason: 'REPLACED' },
      });
      // Revoke happens before the new session row is written.
      expect(prisma.authSession.updateMany.mock.invocationCallOrder[0]).toBeLessThan(
        prisma.authSession.create.mock.invocationCallOrder[0],
      );
      expect(prisma.authSession.create.mock.calls[0][0].data).toMatchObject({
        userAgent: 'Firefox',
        ipAddress: '203.0.113.9',
      });
    });

    it('leaves staff sessions alone unless SINGLE_SESSION_STAFF=true', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...learner, role: UserRole.MODERATOR });
      await service.login({ whatsappNumber: '+8801711111111', password: 'Password123' });
      expect(prisma.authSession.updateMany).not.toHaveBeenCalled();

      process.env.SINGLE_SESSION_STAFF = 'true';
      await service.login({ whatsappNumber: '+8801711111111', password: 'Password123' });
      expect(prisma.authSession.updateMany).toHaveBeenCalledTimes(1);
    });
  });

  it('rejects concurrent password reset with the same token', async () => {
    prisma.$transaction.mockImplementationOnce(async (fn: (tx: typeof prisma) => Promise<unknown>) => {
      const tx = {
        passwordResetToken: {
          updateMany: jest.fn().mockResolvedValue({ count: 0 }),
          findUniqueOrThrow: jest.fn(),
        },
        user: { update: jest.fn() },
        authSession: { updateMany: jest.fn() },
      };
      return fn(tx as never);
    });

    await expect(
      service.resetPassword({ token: 'reset-token-value', newPassword: 'Password123!' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
