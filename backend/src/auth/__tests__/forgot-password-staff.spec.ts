jest.mock('@nestjs/jwt', () => ({
  JwtService: class JwtService {},
}));

import { UserRole, UserStatus } from '@prisma/client';
import { AuthService } from '../auth.service';

/** Password reset rules for dashboard staff vs learners (DEC-048). */
describe('AuthService.forgotPassword', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    passwordResetToken: { updateMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (arg: unknown) =>
    typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as unknown[]),
  );
  const emailQueue = { enqueuePasswordReset: jest.fn() };
  const service = new AuthService(
    prisma as never,
    {} as never,
    {} as never,
    emailQueue as never,
    { record: jest.fn() } as never,
    { record: jest.fn() } as never,
  );
  const GENERIC = { message: 'If an account exists, reset instructions were sent.' };

  function account(overrides: Record<string, unknown>) {
    return {
      id: 'u1',
      email: 'person@example.com',
      emailVerifiedAt: null,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      deletedAt: null,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.PASSWORD_RESET_TTL_SECONDS;
  });

  it.each([UserRole.ADMIN, UserRole.MODERATOR])(
    'sends nothing to a %s whose email is unverified, with the generic response',
    async (role) => {
      prisma.user.findUnique.mockResolvedValue(account({ role }));
      await expect(service.forgotPassword({ email: 'person@example.com' })).resolves.toEqual(GENERIC);
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
      expect(emailQueue.enqueuePasswordReset).not.toHaveBeenCalled();
    },
  );

  it('sends a 30-minute, hashed, single-use link to staff with a verified email', async () => {
    prisma.user.findUnique.mockResolvedValue(
      account({ role: UserRole.MODERATOR, emailVerifiedAt: new Date() }),
    );
    const before = Date.now();
    await expect(service.forgotPassword({ email: 'person@example.com' })).resolves.toEqual(GENERIC);

    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
    const created = prisma.passwordResetToken.create.mock.calls[0][0].data;
    expect(created.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    const ttlMs = created.expiresAt.getTime() - before;
    expect(ttlMs).toBeGreaterThan(29 * 60_000);
    expect(ttlMs).toBeLessThanOrEqual(30 * 60_000 + 1000);

    const job = emailQueue.enqueuePasswordReset.mock.calls[0][0];
    expect(job.to).toBe('person@example.com');
    // The raw token only travels in the link; the DB keeps its hash.
    expect(job.resetUrl).not.toContain(created.tokenHash);
  });

  it('keeps legacy behaviour for learners (unverified email still works)', async () => {
    prisma.user.findUnique.mockResolvedValue(account({ role: UserRole.USER }));
    await service.forgotPassword({ email: 'person@example.com' });
    expect(emailQueue.enqueuePasswordReset).toHaveBeenCalledTimes(1);
  });

  it('returns the same response when no account matches', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.forgotPassword({ email: 'nobody@example.com' })).resolves.toEqual(GENERIC);
    expect(emailQueue.enqueuePasswordReset).not.toHaveBeenCalled();
  });

  it('sends nothing to suspended staff', async () => {
    prisma.user.findUnique.mockResolvedValue(
      account({ role: UserRole.ADMIN, emailVerifiedAt: new Date(), status: UserStatus.SUSPENDED }),
    );
    await expect(service.forgotPassword({ email: 'person@example.com' })).resolves.toEqual(GENERIC);
    expect(emailQueue.enqueuePasswordReset).not.toHaveBeenCalled();
  });
});
