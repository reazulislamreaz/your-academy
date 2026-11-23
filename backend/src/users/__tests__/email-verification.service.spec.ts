import { UnprocessableEntityException } from '@nestjs/common';
import { sha256 } from '../../common/utils/crypto';
import { EmailVerificationService } from '../email-verification.service';

describe('EmailVerificationService', () => {
  const prisma = {
    user: { findUniqueOrThrow: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    emailVerificationToken: {
      updateMany: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const emailQueue = { enqueueEmailVerification: jest.fn() };
  const service = new EmailVerificationService(prisma as never, emailQueue as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (arg: unknown) =>
      typeof arg === 'function' ? (arg as (tx: unknown) => unknown)(prisma) : Promise.all(arg as unknown[]),
    );
  });

  it('stores only a hash bound to the current address and emails the raw token', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', email: 'me@example.com', emailVerifiedAt: null });
    await service.sendForCurrentEmail('u1');

    const data = prisma.emailVerificationToken.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ userId: 'u1', email: 'me@example.com' });
    const job = emailQueue.enqueueEmailVerification.mock.calls[0][0];
    const raw = new URL(job.verifyUrl).searchParams.get('token')!;
    expect(sha256(raw)).toBe(data.tokenHash);
    expect(job.verifyUrl).not.toContain(data.tokenHash);
    // Older links stop working.
    expect(prisma.emailVerificationToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u1', usedAt: null },
      data: { usedAt: expect.any(Date) },
    });
  });

  it('requires an email before sending', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', email: null, emailVerifiedAt: null });
    await expect(service.sendForCurrentEmail('u1')).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('verifies a valid, unused token for the same address', async () => {
    prisma.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.emailVerificationToken.findUnique.mockResolvedValue({ userId: 'u1', email: 'me@example.com' });
    prisma.user.findFirst.mockResolvedValue({ id: 'u1', email: 'me@example.com' });

    await expect(service.verify('t'.repeat(40))).resolves.toEqual({ message: 'Email verified.' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { emailVerifiedAt: expect.any(Date) },
    });
  });

  it('rejects used or expired tokens', async () => {
    prisma.emailVerificationToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.verify('t'.repeat(40))).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('rejects a link sent to an address the user has since changed', async () => {
    prisma.emailVerificationToken.updateMany.mockResolvedValue({ count: 1 });
    prisma.emailVerificationToken.findUnique.mockResolvedValue({ userId: 'u1', email: 'old@example.com' });
    prisma.user.findFirst.mockResolvedValue({ id: 'u1', email: 'new@example.com' });
    await expect(service.verify('t'.repeat(40))).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
