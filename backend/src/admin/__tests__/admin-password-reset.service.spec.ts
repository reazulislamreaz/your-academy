import { UserRole, UserStatus } from '@prisma/client';
import { AdminPasswordResetService, generateTemporaryPassword } from '../admin-password-reset.service';

function errCode(err: unknown): string | undefined {
  const res = (err as { getResponse?: () => unknown }).getResponse?.() as
    | { error?: { code?: string } }
    | undefined;
  return res?.error?.code;
}

describe('AdminPasswordResetService', () => {
  const prisma = {
    user: { findFirst: jest.fn(), update: jest.fn() },
    auditLog: { count: jest.fn(), findMany: jest.fn() },
    passwordResetToken: { updateMany: jest.fn(), create: jest.fn() },
    emailVerificationToken: { updateMany: jest.fn() },
    authSession: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => unknown) => fn(prisma));
  const audit = { record: jest.fn() };
  const emailQueue = { enqueuePasswordReset: jest.fn(), enqueueEmailChangedNotice: jest.fn() };
  const service = new AdminPasswordResetService(prisma as never, audit as never, emailQueue as never);

  const learner = {
    id: 'u1',
    name: 'Rahim',
    whatsappNumber: '+8801711111111',
    email: null as string | null,
    emailVerifiedAt: null,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.auditLog.count.mockResolvedValue(0);
    prisma.user.findFirst.mockImplementation(async ({ where }: { where: { id?: unknown } }) =>
      typeof where.id === 'string' ? learner : null,
    );
  });

  describe('target rules', () => {
    it('refuses the acting admin and other admins', async () => {
      expect(errCode(await service.createShareableLink('a1', 'a1').catch((e: unknown) => e))).toBe('USE_ACCOUNT_SETTINGS');
      prisma.user.findFirst.mockResolvedValueOnce({ ...learner, role: UserRole.ADMIN });
      expect(errCode(await service.createShareableLink('u1', 'a1').catch((e: unknown) => e))).toBe('ADMIN_TARGET_FORBIDDEN');
    });

    it('rate-limits resets per user (429)', async () => {
      prisma.auditLog.count.mockResolvedValue(5);
      const err = await service.createShareableLink('u1', 'a1').catch((e: unknown) => e);
      expect(errCode(err)).toBe('RESET_RATE_LIMITED');
      expect((err as { getStatus: () => number }).getStatus()).toBe(429);
      expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    });
  });

  describe('Option A — email', () => {
    it('requires an email when the account has none', async () => {
      expect(errCode(await service.sendByEmail('u1', undefined, 'a1').catch((e: unknown) => e))).toBe('EMAIL_REQUIRED');
    });

    it('rejects an email used by another account', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce(learner)
        .mockResolvedValueOnce({ id: 'someone-else' });
      expect(errCode(await service.sendByEmail('u1', 'taken@example.com', 'a1').catch((e: unknown) => e))).toBe('EMAIL_EXISTS');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('saves the new email unverified, binds the link to it, sends the reset email and audits', async () => {
      const res = await service.sendByEmail('u1', ' New@Example.com ', 'a1', '10.0.0.1');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { email: 'new@example.com', emailVerifiedAt: null },
      });
      // Older links are voided before the new one is stored (hash only).
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
      const created = prisma.passwordResetToken.create.mock.calls[0][0].data;
      expect(created.verifiesEmail).toBe('new@example.com');
      expect(created.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(emailQueue.enqueuePasswordReset.mock.calls[0][0].to).toBe('new@example.com');
      // No previous address → no change notice.
      expect(emailQueue.enqueueEmailChangedNotice).not.toHaveBeenCalled();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          actorUserId: 'a1',
          action: 'ADMIN_PASSWORD_RESET_EMAIL',
          entityId: 'u1',
          metadata: expect.objectContaining({ option: 'email', email: 'new@example.com' }),
        }),
      );
      expect(res).toMatchObject({ email: 'new@example.com', emailChanged: true });
    });

    it('notifies the old address when an existing email is replaced', async () => {
      prisma.user.findFirst
        .mockResolvedValueOnce({ ...learner, email: 'old@example.com' })
        .mockResolvedValueOnce(null);
      await service.sendByEmail('u1', 'new@example.com', 'a1');
      expect(emailQueue.enqueueEmailChangedNotice).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'old@example.com', newEmailMasked: 'ne***@example.com' }),
        expect.any(String),
      );
    });
  });

  describe('Option B — WhatsApp link', () => {
    it('returns a fresh link once and records the action without the link', async () => {
      const res = await service.createShareableLink('u1', 'a1');
      expect(res.resetUrl).toMatch(/reset-password\?token=/);
      expect(res.whatsappNumber).toBe('+8801711111111');
      const stored = prisma.passwordResetToken.create.mock.calls[0][0].data;
      expect(res.resetUrl).not.toContain(stored.tokenHash);
      expect(JSON.stringify(audit.record.mock.calls[0][0])).not.toContain('token=');
    });
  });

  describe('Option C — temporary password', () => {
    it('forces a change, signs out everywhere, voids links, and never audits the password', async () => {
      const res = await service.setTemporaryPassword('u1', undefined, 'a1');
      expect(res.generated).toBe(true);
      expect(res.temporaryPassword).toMatch(/^(?=.*[A-Za-z])(?=.*\d).{12}$/);
      const update = prisma.user.update.mock.calls[0][0];
      expect(update.data.mustChangePassword).toBe(true);
      expect(update.data.passwordHash).not.toBe(res.temporaryPassword);
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', revokedAt: null },
        data: { revokedAt: expect.any(Date), revokedReason: 'ADMIN_RESET' },
      });
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalled();
      expect(JSON.stringify(audit.record.mock.calls)).not.toContain(res.temporaryPassword as string);
    });

    it('does not echo a password the admin typed', async () => {
      const res = await service.setTemporaryPassword('u1', 'Typed1234', 'a1');
      expect(res).toEqual({ temporaryPassword: null, generated: false });
    });
  });

  it('generates policy-compliant temporary passwords', () => {
    for (let i = 0; i < 50; i++) {
      expect(generateTemporaryPassword()).toMatch(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z2-9]{12}$/);
    }
  });
});
