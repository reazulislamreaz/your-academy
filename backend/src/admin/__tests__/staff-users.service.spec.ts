import {
  ConflictException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { StaffUsersService } from '../staff-users.service';

describe('StaffUsersService', () => {
  const now = new Date('2026-11-23T10:00:00.000Z');
  const prisma = {
    user: {
      create: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    authSession: { updateMany: jest.fn() },
    passwordResetToken: { updateMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const service = new StaffUsersService(prisma as never, audit as never);

  function row(overrides: Record<string, unknown> = {}) {
    return {
      id: 'target',
      name: 'Mod One',
      whatsappNumber: '+8801712345678',
      email: null,
      emailVerifiedAt: null,
      role: UserRole.MODERATOR,
      status: UserStatus.ACTIVE,
      createdAt: now,
      ...overrides,
    };
  }

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
  });

  describe('create', () => {
    it('normalises WhatsApp to E.164, hashes with Argon2id, and never stores the password', async () => {
      prisma.user.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => row({ ...data, id: 'new' }));
      const result = await service.create(
        { name: ' New Mod ', whatsappNumber: '01712345678', password: 'Secret123', role: UserRole.MODERATOR },
        'admin-1',
      );

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.whatsappNumber).toBe('+8801712345678');
      expect(data.role).toBe(UserRole.MODERATOR);
      expect(data.passwordHash).toMatch(/^\$argon2id\$/);
      expect(await argon2.verify(data.passwordHash, 'Secret123')).toBe(true);
      expect(JSON.stringify(data)).not.toContain('Secret123');
      expect(JSON.stringify(audit.record.mock.calls)).not.toContain('Secret123');
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('rejects invalid WhatsApp numbers', async () => {
      await expect(
        service.create(
          { name: 'X Y', whatsappNumber: '12345678', password: 'Secret123', role: UserRole.ADMIN },
          'admin-1',
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });

    it('maps a duplicate WhatsApp number to 409 WHATSAPP_EXISTS', async () => {
      prisma.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('dup', {
          code: 'P2002',
          clientVersion: 'x',
          meta: { target: ['whatsapp_number'] },
        }),
      );
      await expect(
        service.create(
          { name: 'X Y', whatsappNumber: '01712345678', password: 'Secret123', role: UserRole.ADMIN },
          'admin-1',
        ),
      ).rejects.toMatchObject({ response: { error: { code: 'WHATSAPP_EXISTS' } } });
    });
  });

  describe('changeRole', () => {
    it('forbids changing your own role', async () => {
      await expect(service.changeRole('admin-1', UserRole.MODERATOR, 'admin-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses to demote the last active admin', async () => {
      prisma.user.findFirst.mockResolvedValue(row({ id: 'only-admin', role: UserRole.ADMIN }));
      prisma.user.count.mockResolvedValue(0);
      await expect(service.changeRole('only-admin', UserRole.MODERATOR, 'other')).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('demotes an admin when another active admin remains', async () => {
      prisma.user.findFirst.mockResolvedValue(row({ id: 'a2', role: UserRole.ADMIN }));
      prisma.user.count.mockResolvedValue(1);
      prisma.user.update.mockResolvedValue(row({ id: 'a2', role: UserRole.MODERATOR }));
      const result = await service.changeRole('a2', UserRole.MODERATOR, 'a1');
      expect(result.role).toBe(UserRole.MODERATOR);
      expect(prisma.user.count).toHaveBeenCalledWith({
        where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE, deletedAt: null, id: { not: 'a2' } },
      });
    });

    it('promotes a moderator to admin', async () => {
      prisma.user.findFirst.mockResolvedValue(row());
      prisma.user.update.mockResolvedValue(row({ role: UserRole.ADMIN }));
      await expect(service.changeRole('target', UserRole.ADMIN, 'a1')).resolves.toMatchObject({
        role: UserRole.ADMIN,
      });
    });

    it('does not turn learner accounts into staff', async () => {
      prisma.user.findFirst.mockResolvedValue(row({ role: UserRole.USER }));
      await expect(service.changeRole('target', UserRole.ADMIN, 'a1')).rejects.toBeInstanceOf(
        UnprocessableEntityException,
      );
    });
  });

  describe('updateStatus', () => {
    it('forbids deactivating yourself', async () => {
      await expect(service.updateStatus('a1', UserStatus.SUSPENDED, 'a1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('refuses to deactivate the last active admin', async () => {
      prisma.user.findFirst.mockResolvedValue(row({ role: UserRole.ADMIN }));
      prisma.user.count.mockResolvedValue(0);
      await expect(service.updateStatus('target', UserStatus.SUSPENDED, 'a1')).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('deactivates a moderator and revokes all of their sessions', async () => {
      prisma.user.findFirst.mockResolvedValue(row());
      prisma.user.update.mockResolvedValue(row({ status: UserStatus.SUSPENDED }));
      await service.updateStatus('target', UserStatus.SUSPENDED, 'a1');
      expect(prisma.authSession.updateMany).toHaveBeenCalledWith({
        where: { userId: 'target', revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('resetModeratorPassword', () => {
    it('resets a moderator password, revokes sessions, and burns reset tokens', async () => {
      prisma.user.findFirst.mockResolvedValue(row());
      await service.resetModeratorPassword('target', { newPassword: 'NewSecret1' }, 'a1');

      const hash = prisma.user.update.mock.calls[0][0].data.passwordHash;
      expect(await argon2.verify(hash, 'NewSecret1')).toBe(true);
      expect(prisma.authSession.updateMany).toHaveBeenCalled();
      expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: 'target', usedAt: null },
        data: { usedAt: expect.any(Date) },
      });
    });

    it('refuses to reset another admin', async () => {
      prisma.user.findFirst.mockResolvedValue(row({ role: UserRole.ADMIN }));
      await expect(
        service.resetModeratorPassword('target', { newPassword: 'NewSecret1' }, 'a1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('marks a changed email as unverified', async () => {
      prisma.user.findFirst.mockResolvedValue(row({ email: 'old@example.com', emailVerifiedAt: now }));
      prisma.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => row({ ...data }));
      const result = await service.update('target', { email: 'New@Example.com' }, 'a1');
      expect(prisma.user.update.mock.calls[0][0].data).toMatchObject({
        email: 'new@example.com',
        emailVerifiedAt: null,
      });
      expect(result.emailVerified).toBe(false);
    });
  });
});
