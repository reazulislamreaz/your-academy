jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import { UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
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
  const access = { getAccessSnapshot: jest.fn() };
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
    process.env.TRIAL_DAYS = '7';
  });

  it('sets trialEndsAt ~7 days from registration', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    const created = {
      id: 'u1',
      name: 'Learner',
      whatsappNumber: '+8801711111111',
      email: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      trialStartedAt: new Date('2026-11-02T00:00:00.000Z'),
      trialEndsAt: new Date('2026-11-09T00:00:00.000Z'),
      passwordHash: 'hash',
    };
    prisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
      const trialStartedAt = data.trialStartedAt as Date;
      const trialEndsAt = data.trialEndsAt as Date;
      const delta = trialEndsAt.getTime() - trialStartedAt.getTime();
      expect(delta).toBe(7 * 24 * 60 * 60 * 1000);
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
      data: { revokedAt: expect.any(Date) },
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
