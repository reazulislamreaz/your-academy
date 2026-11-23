jest.mock('@nestjs/passport', () => ({
  AuthGuard: () => class MockAuthGuard {},
  PassportStrategy: () => class MockPassportStrategy {},
}));

import {
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { GUARDS_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { SubscriptionStatus, UserRole } from '@prisma/client';
import { hasPermission, type DashboardPermission } from '@your-academy/shared';
import { PERMISSION_KEY } from '../../common/decorators/require-permission.decorator';
import { CsrfGuard } from '../../common/guards/csrf.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AdminSubscriptionsController } from '../admin-subscriptions.controller';
import { AdminSubscriptionsService } from '../admin-subscriptions.service';

describe('AdminSubscriptionsService (DEC-052)', () => {
  const now = new Date('2026-11-23T10:00:00.000Z');
  const prisma = {
    user: { findFirst: jest.fn() },
    subscriptionPlan: { upsert: jest.fn() },
    userSubscription: {
      findMany: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const audit = { record: jest.fn() };
  const service = new AdminSubscriptionsService(prisma as never, audit as never);

  const learner = { id: 'u1', role: UserRole.USER };
  const sub = (overrides: Record<string, unknown> = {}) => ({
    id: 's-new',
    status: SubscriptionStatus.ACTIVE,
    startsAt: now,
    endsAt: new Date('2026-12-23T10:00:00.000Z'),
    canceledAt: null,
    createdAt: now,
    plan: { code: 'PREMIUM', name: 'Premium' },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => fn(prisma));
    prisma.user.findFirst.mockResolvedValue(learner);
    prisma.subscriptionPlan.upsert.mockResolvedValue({ id: 'plan-1' });
    prisma.userSubscription.create.mockResolvedValue({ id: 's-new' });
    prisma.userSubscription.findMany.mockResolvedValue([]);
  });

  describe('grant', () => {
    it('creates an ACTIVE subscription, cancels open ones in one transaction, and audits', async () => {
      prisma.userSubscription.findMany
        .mockResolvedValueOnce([{ id: 's-old' }]) // open subs inside tx
        .mockResolvedValueOnce([sub(), sub({ id: 's-old', status: SubscriptionStatus.CANCELED })]);

      const result = await service.grant(
        'u1',
        { endsAt: '2026-12-23T10:00:00.000Z', note: ' paid cash ' },
        'admin-1',
        '127.0.0.1',
        now,
      );

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(prisma.userSubscription.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['s-old'] } },
        data: { status: SubscriptionStatus.CANCELED, canceledAt: now },
      });
      const data = prisma.userSubscription.create.mock.calls[0][0].data;
      expect(data).toMatchObject({
        userId: 'u1',
        planId: 'plan-1',
        status: SubscriptionStatus.ACTIVE,
        startsAt: now,
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBSCRIPTION_GRANT',
          actorUserId: 'admin-1',
          entityId: 's-new',
          metadata: expect.objectContaining({
            userId: 'u1',
            note: 'paid cash',
            replacedSubscriptionIds: ['s-old'],
          }),
        }),
      );
      expect(result.hasActiveSubscription).toBe(true);
      expect(result.current?.id).toBe('s-new');
    });

    it('rejects an end date that is not after the start', async () => {
      await expect(
        service.grant(
          'u1',
          { startsAt: '2026-12-01T00:00:00.000Z', endsAt: '2026-11-30T00:00:00.000Z' },
          'admin-1',
          null,
          now,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
      expect(prisma.userSubscription.create).not.toHaveBeenCalled();
    });

    it('rejects an end date in the past', async () => {
      await expect(
        service.grant(
          'u1',
          { startsAt: '2026-01-01T00:00:00.000Z', endsAt: '2026-02-01T00:00:00.000Z' },
          'admin-1',
          null,
          now,
        ),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('refuses to grant to admins (already entitled)', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'a1', role: UserRole.ADMIN });
      await expect(
        service.grant('a1', { endsAt: '2026-12-23T10:00:00.000Z' }, 'admin-1', null, now),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('404s for unknown / deleted users', async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(
        service.grant('nope', { endsAt: '2026-12-23T10:00:00.000Z' }, 'admin-1', null, now),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.user.findFirst.mock.calls[0][0].where).toMatchObject({ deletedAt: null });
    });
  });

  describe('revoke', () => {
    it('cancels every open ACTIVE subscription and audits', async () => {
      prisma.userSubscription.findMany
        .mockResolvedValueOnce([{ id: 's1' }, { id: 's2' }])
        .mockResolvedValueOnce([sub({ id: 's1', status: SubscriptionStatus.CANCELED, canceledAt: now })]);

      const result = await service.revoke('u1', { note: 'refund' }, 'admin-1', null, now);

      expect(prisma.userSubscription.findMany.mock.calls[0][0].where).toEqual({
        userId: 'u1',
        status: SubscriptionStatus.ACTIVE,
        endsAt: { gt: now },
      });
      expect(prisma.userSubscription.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['s1', 's2'] } },
        data: { status: SubscriptionStatus.CANCELED, canceledAt: now },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'SUBSCRIPTION_REVOKE',
          metadata: expect.objectContaining({ revokedSubscriptionIds: ['s1', 's2'], note: 'refund' }),
        }),
      );
      expect(result.hasActiveSubscription).toBe(false);
      expect(result.current).toBeNull();
    });

    it('404s when nothing is active', async () => {
      prisma.userSubscription.findMany.mockResolvedValueOnce([]);
      await expect(service.revoke('u1', {}, 'admin-1', null, now)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(audit.record).not.toHaveBeenCalled();
    });
  });

  describe('overview', () => {
    it('marks only in-window ACTIVE rows as current', async () => {
      prisma.userSubscription.findMany.mockResolvedValueOnce([
        sub({ id: 'future', startsAt: new Date('2027-01-01T00:00:00.000Z'), endsAt: new Date('2027-02-01T00:00:00.000Z') }),
        sub({ id: 'expired', startsAt: new Date('2026-01-01T00:00:00.000Z'), endsAt: new Date('2026-02-01T00:00:00.000Z') }),
      ]);
      const result = await service.getOverview('u1', now);
      expect(result.current).toBeNull();
      expect(result.history.map((h) => h.isCurrent)).toEqual([false, false]);
    });
  });
});

describe('AdminSubscriptionsController guards (DEC-052)', () => {
  const reflector = new Reflector();
  const proto = AdminSubscriptionsController.prototype as unknown as Record<string, object>;

  it('is mounted under /api/v1/admin/users/:id/subscription', () => {
    expect(Reflect.getMetadata(PATH_METADATA, AdminSubscriptionsController)).toBe(
      'api/v1/admin/users/:id/subscription',
    );
  });

  it('requires PermissionsGuard + the Admin-only `users` permission', () => {
    const classGuards = Reflect.getMetadata(GUARDS_METADATA, AdminSubscriptionsController) as unknown[];
    expect(classGuards).toContain(PermissionsGuard);
    for (const method of ['overview', 'grant', 'revoke', 'revokeViaDelete']) {
      const permission = reflector.getAllAndOverride<DashboardPermission>(PERMISSION_KEY, [
        proto[method] as () => void,
        AdminSubscriptionsController,
      ]);
      expect(permission).toBe('users');
      expect(hasPermission(UserRole.ADMIN, permission)).toBe(true);
      expect(hasPermission(UserRole.MODERATOR, permission)).toBe(false);
      expect(hasPermission(UserRole.USER, permission)).toBe(false);
    }
  });

  it.each(['grant', 'revoke', 'revokeViaDelete'])('%s requires CSRF', (method) => {
    expect(Reflect.getMetadata(GUARDS_METADATA, proto[method])).toContain(CsrfGuard);
  });
});
