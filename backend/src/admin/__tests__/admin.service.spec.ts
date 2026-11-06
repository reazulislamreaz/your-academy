import { ForbiddenException } from '@nestjs/common';
import { UserRole, UserStatus } from '@prisma/client';
import { AdminService } from '../admin.service';

describe('AdminService role and trial management', () => {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };
  const service = new AdminService(prisma as never);

  const targetUser = {
    id: 'u2',
    name: 'Learner',
    whatsappNumber: '+8801000000002',
    email: null,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    trialStartedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
    trialEndsAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findFirst.mockResolvedValue({ ...targetUser });
    prisma.user.update.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ...targetUser,
      ...data,
    }));
    prisma.auditLog.create.mockResolvedValue({ id: 'log1' });
  });

  it('promotes another user to admin and audit-logs the change', async () => {
    const updated = await service.updateUserRole('u2', UserRole.ADMIN, 'admin1');
    expect(updated.role).toBe(UserRole.ADMIN);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u2' }, data: { role: UserRole.ADMIN } }),
    );
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorUserId: 'admin1',
        action: 'USER_ROLE_CHANGE',
        entityId: 'u2',
        metadata: { fromRole: UserRole.USER, toRole: UserRole.ADMIN },
      }),
    });
  });

  it('demotes another admin back to user', async () => {
    prisma.user.findFirst.mockResolvedValue({ ...targetUser, role: UserRole.ADMIN });
    const updated = await service.updateUserRole('u2', UserRole.USER, 'admin1');
    expect(updated.role).toBe(UserRole.USER);
  });

  it('forbids an admin from changing their own role', async () => {
    await expect(service.updateUserRole('admin1', UserRole.USER, 'admin1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
  });

  it('extends a still-active trial forward from its current end', async () => {
    const currentEnd = targetUser.trialEndsAt.getTime();
    const updated = await service.extendTrial('u2', 7, 'admin1');
    const expected = new Date(currentEnd + 7 * 24 * 60 * 60 * 1000);
    expect(updated.trialEndsAt.getTime()).toBe(expected.getTime());
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: 'USER_TRIAL_EXTEND', entityId: 'u2' }),
    });
  });

  it('never moves a trial backwards: an expired trial extends from now', async () => {
    const expiredEnd = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    prisma.user.findFirst.mockResolvedValue({ ...targetUser, trialEndsAt: expiredEnd });
    const before = Date.now();
    const updated = await service.extendTrial('u2', 7, 'admin1');
    const after = Date.now();
    // New end is now + 7 days, never the old (expired) end + 7 days.
    expect(updated.trialEndsAt.getTime()).toBeGreaterThan(before + 7 * 24 * 60 * 60 * 1000 - 1000);
    expect(updated.trialEndsAt.getTime()).toBeLessThan(after + 7 * 24 * 60 * 60 * 1000 + 1000);
    expect(updated.trialEndsAt.getTime()).toBeGreaterThan(expiredEnd.getTime());
  });
});
