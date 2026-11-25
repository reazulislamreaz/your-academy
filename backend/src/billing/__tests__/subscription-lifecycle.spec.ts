import { PackageDuration, Prisma, SubscriptionEventAction, UserRole } from '@prisma/client';
import { PackagesService, effectivePrice } from '../packages.service';
import { SubscriptionRemindersService } from '../subscription-reminders.service';
import { SubscriptionsService, classifyPlanChange } from '../subscriptions.service';

const D = (v: string) => new Prisma.Decimal(v);
const plan = (
  id: string,
  duration: PackageDuration,
  price: string,
  discounted: string | null = null,
) => ({
  id,
  duration,
  priceBdt: D(price),
  discountedPriceBdt: discounted === null ? null : D(discounted),
});

describe('DEC-062 classifyPlanChange', () => {
  const three = plan('3m', PackageDuration.THREE_MONTHS, '600');
  const six = plan('6m', PackageDuration.SIX_MONTHS, '1000');
  const year = plan('1y', PackageDuration.YEARLY, '1800', '1500');

  it('NEW when nothing is running', () => {
    expect(classifyPlanChange(null, six)).toBe('NEW');
  });
  it('longer plan = UPGRADE, shorter = DOWNGRADE, same = RENEW', () => {
    expect(classifyPlanChange(three, six)).toBe('UPGRADE');
    expect(classifyPlanChange(six, year)).toBe('UPGRADE');
    expect(classifyPlanChange(year, three)).toBe('DOWNGRADE');
    expect(classifyPlanChange(six, six)).toBe('RENEW');
  });
  it('same length: higher effective (discounted) price = UPGRADE, else DOWNGRADE', () => {
    const sixPremium = plan('6p', PackageDuration.SIX_MONTHS, '2000', '1200');
    expect(classifyPlanChange(six, sixPremium)).toBe('UPGRADE');
    expect(classifyPlanChange(sixPremium, six)).toBe('DOWNGRADE');
  });
});

describe('DEC-062 learner self-service', () => {
  const now = new Date('2026-11-25T12:00:00.000Z');
  const sixPkg = plan('6m', PackageDuration.SIX_MONTHS, '1000');
  const threePkg = { ...plan('3m', PackageDuration.THREE_MONTHS, '600'), name: '3 Months' };
  const yearPkg = { ...plan('1y', PackageDuration.YEARLY, '1800'), name: '1 Year' };

  function setup(current: Record<string, unknown> | null) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      userSubscription: {
        findUnique: jest.fn().mockResolvedValue(current),
        update: jest.fn().mockResolvedValue({}),
      },
      subscriptionEvent: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = {
      $transaction: jest.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
      userSubscription: { findUnique: jest.fn().mockResolvedValue(null) },
      paymentOrder: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const packages = {
      findPurchasable: jest.fn((id: string) =>
        Promise.resolve([threePkg, yearPkg].find((p) => p.id === id)),
      ),
      listActive: jest.fn().mockResolvedValue([]),
      toDto: jest.fn(),
    };
    const service = new SubscriptionsService(
      prisma as never,
      { record: jest.fn() } as never,
      packages as never,
    );
    return { service, tx };
  }
  const running = {
    startsAt: new Date('2026-11-01T00:00:00Z'),
    endsAt: new Date('2027-05-01T00:00:00Z'),
    disabledAt: null,
    packageId: '6m',
    cancelAtPeriodEnd: false,
    scheduledPackageId: null,
    package: sixPkg,
  };

  it('cancel keeps the end date, sets cancelAtPeriodEnd + canceledAt and logs CANCEL', async () => {
    const { service, tx } = setup(running);
    await service.cancelAtPeriodEnd('u1', UserRole.USER, now);
    expect(tx.userSubscription.update).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      data: { cancelAtPeriodEnd: true, canceledAt: now, scheduledPackageId: null },
    });
    const event = tx.subscriptionEvent.create.mock.calls[0][0].data;
    expect(event).toMatchObject({
      action: SubscriptionEventAction.CANCEL,
      newEndsAt: running.endsAt,
    });
  });

  it('cancel twice is a 409; cancel without a running plan is a 409', async () => {
    await expect(
      setup({ ...running, cancelAtPeriodEnd: true }).service.cancelAtPeriodEnd(
        'u1',
        UserRole.USER,
        now,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      setup({ ...running, endsAt: new Date('2026-11-20T00:00:00Z') }).service.cancelAtPeriodEnd(
        'u1',
        UserRole.USER,
        now,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('resume clears the cancellation', async () => {
    const { service, tx } = setup({ ...running, cancelAtPeriodEnd: true });
    await service.resume('u1', UserRole.USER, now);
    expect(tx.userSubscription.update.mock.calls[0][0].data).toEqual({
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });
  });

  it('downgrade is scheduled (end date untouched) and un-cancels renewal', async () => {
    const { service, tx } = setup({ ...running, cancelAtPeriodEnd: true });
    await service.scheduleChange('u1', UserRole.USER, '3m', now);
    expect(tx.userSubscription.update.mock.calls[0][0].data).toEqual({
      scheduledPackageId: '3m',
      cancelAtPeriodEnd: false,
      canceledAt: null,
    });
    expect(tx.subscriptionEvent.create.mock.calls[0][0].data.action).toBe(
      SubscriptionEventAction.SCHEDULE_CHANGE,
    );
  });

  it('an upgrade cannot be scheduled (it must be bought)', async () => {
    const { service, tx } = setup(running);
    await expect(service.scheduleChange('u1', UserRole.USER, '1y', now)).rejects.toMatchObject({
      status: 422,
    });
    expect(tx.userSubscription.update).not.toHaveBeenCalled();
  });

  it('admins are refused', async () => {
    const { service } = setup(running);
    await expect(service.cancelAtPeriodEnd('a', UserRole.ADMIN, now)).rejects.toMatchObject({
      status: 409,
    });
  });

  it('a purchase clears cancel + scheduled downgrade and resets reminder flags', async () => {
    const { service, tx } = setup({
      ...running,
      cancelAtPeriodEnd: true,
      scheduledPackageId: '3m',
    });
    (tx.userSubscription as Record<string, jest.Mock>).upsert = jest.fn().mockResolvedValue({});
    await service.applyPurchase(
      tx as never,
      { id: 'o1', userId: 'u1', packageId: '3m', duration: PackageDuration.THREE_MONTHS },
      now,
    );
    const update = (tx.userSubscription as Record<string, jest.Mock>).upsert.mock.calls[0][0]
      .update;
    expect(update).toMatchObject({
      cancelAtPeriodEnd: false,
      canceledAt: null,
      scheduledPackageId: null,
      reminder7DaysSentAt: null,
      reminder3DaysSentAt: null,
      packageId: '3m',
      // Added on top of the remaining time.
      endsAt: new Date('2027-08-01T00:00:00Z'),
    });
  });
});

describe('DEC-062 SubscriptionRemindersService', () => {
  const now = new Date('2026-11-25T12:00:00.000Z');
  const day = 86_400_000;
  const pkg = {
    name: '6 Months',
    isActive: true,
    deletedAt: null,
    priceBdt: D('1000'),
    discountedPriceBdt: D('900'),
  };
  const row = (id: string, daysLeft: number, extra: Record<string, unknown> = {}) => ({
    id,
    userId: `user-${id}`,
    endsAt: new Date(now.getTime() + daysLeft * day),
    cancelAtPeriodEnd: false,
    reminder7DaysSentAt: null,
    reminder3DaysSentAt: null,
    package: pkg,
    scheduledPackage: null,
    user: { email: `${id}@example.com`, name: `User ${id}` },
    ...extra,
  });

  function setup(
    rows: ReturnType<typeof row>[],
    opts: { paidOn?: boolean; claimCount?: number } = {},
  ) {
    const updateMany = jest.fn().mockResolvedValue({ count: opts.claimCount ?? 1 });
    const prisma = {
      userSubscription: { findMany: jest.fn().mockResolvedValue(rows), updateMany },
    };
    const queue = { enqueueSubscriptionReminder: jest.fn().mockResolvedValue(undefined) };
    const settings = {
      get: jest.fn().mockResolvedValue({ paidSystemEnabled: opts.paidOn ?? true }),
    };
    const service = new SubscriptionRemindersService(
      prisma as never,
      settings as never,
      queue as never,
    );
    return { service, prisma, queue, updateMany };
  }

  it('sends a 7-day and a 3-day reminder with renewal price, claiming each flag once', async () => {
    const { service, queue, updateMany } = setup([row('a', 6.5), row('b', 2.2)]);
    expect(await service.runOnce(now)).toEqual({ sent7: 1, sent3: 1, failed: 0 });

    expect(updateMany.mock.calls[0][0]).toMatchObject({
      where: { id: 'a', reminder7DaysSentAt: null },
      data: { reminder7DaysSentAt: now },
    });
    // 3-day also marks the 7-day one so it never goes out late.
    expect(updateMany.mock.calls[1][0]).toMatchObject({
      where: { id: 'b', reminder3DaysSentAt: null },
      data: { reminder3DaysSentAt: now, reminder7DaysSentAt: now },
    });
    const [job7, key7] = queue.enqueueSubscriptionReminder.mock.calls[0];
    expect(job7).toMatchObject({
      window: 7,
      daysLeft: 7,
      renewal: { planName: '6 Months', amountBdt: '900.00' },
      cancelled: false,
    });
    expect(job7.manageUrl).toMatch(/\/billing$/);
    expect(key7).toBe(`a-7d-${now.getTime() + 6.5 * day}`);
    expect(queue.enqueueSubscriptionReminder.mock.calls[1][0]).toMatchObject({
      window: 3,
      daysLeft: 3,
    });
  });

  it('no duplicate: when the flag was already claimed nothing is queued', async () => {
    const { service, queue } = setup([row('a', 6)], { claimCount: 0 });
    expect(await service.runOnce(now)).toEqual({ sent7: 0, sent3: 0, failed: 0 });
    expect(queue.enqueueSubscriptionReminder).not.toHaveBeenCalled();
  });

  it('renewal quotes the scheduled downgrade; cancelled is passed through', async () => {
    const three = { ...pkg, name: '3 Months', priceBdt: D('600'), discountedPriceBdt: null };
    const { service, queue } = setup([
      row('a', 3, { scheduledPackage: three, cancelAtPeriodEnd: true }),
    ]);
    await service.runOnce(now);
    expect(queue.enqueueSubscriptionReminder.mock.calls[0][0]).toMatchObject({
      renewal: { planName: '3 Months', amountBdt: '600.00' },
      cancelled: true,
    });
  });

  it('queue failure releases the claim so the next run retries', async () => {
    const { service, queue, updateMany } = setup([row('a', 6)]);
    queue.enqueueSubscriptionReminder.mockRejectedValueOnce(new Error('redis down'));
    expect(await service.runOnce(now)).toEqual({ sent7: 0, sent3: 0, failed: 1 });
    expect(updateMany.mock.calls[1][0]).toMatchObject({
      where: { id: 'a', reminder7DaysSentAt: now },
      data: { reminder7DaysSentAt: null },
    });
  });

  it('does nothing while the paid system is OFF', async () => {
    const { service, prisma } = setup([row('a', 6)], { paidOn: false });
    expect(await service.runOnce(now)).toEqual({ sent7: 0, sent3: 0, failed: 0 });
    expect(prisma.userSubscription.findMany).not.toHaveBeenCalled();
  });

  it('only queries verified, non-admin learners in the 7-day window', async () => {
    const { service, prisma } = setup([]);
    await service.runOnce(now);
    const where = prisma.userSubscription.findMany.mock.calls[0][0].where;
    expect(where.user).toMatchObject({ email: { not: null }, emailVerifiedAt: { not: null } });
    expect(where.endsAt).toEqual({ gt: now, lte: new Date(now.getTime() + 7 * day) });
    expect(where.disabledAt).toBeNull();
  });
});

describe('DEC-062 package discount', () => {
  const row = {
    id: 'p',
    name: '3 Months',
    duration: PackageDuration.THREE_MONTHS,
    priceBdt: D('600'),
    discountedPriceBdt: D('450'),
    isPopular: true,
    description: null,
    features: [],
    isActive: true,
    sortOrder: 0,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it('checkout charges the discounted price when set', () => {
    expect(effectivePrice(row).toFixed(2)).toBe('450.00');
    expect(effectivePrice({ ...row, discountedPriceBdt: null }).toFixed(2)).toBe('600.00');
  });

  it('rejects a "discount" that is not below the regular price (incl. partial updates)', async () => {
    const prisma = {
      subscriptionPackage: {
        create: jest.fn().mockResolvedValue(row),
        update: jest.fn().mockResolvedValue(row),
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'p', priceBdt: D('600'), discountedPriceBdt: D('450') }),
      },
    };
    const service = new PackagesService(prisma as never, { record: jest.fn() } as never);
    const base = { name: '3 Months', duration: PackageDuration.THREE_MONTHS, priceBdt: '600' };
    await expect(
      service.create({ ...base, discountedPriceBdt: '600' }, 'admin'),
    ).rejects.toMatchObject({
      status: 422,
    });
    // Lowering the price below the stored discount is caught too.
    await expect(service.update('p', { priceBdt: '400' }, 'admin')).rejects.toMatchObject({
      status: 422,
    });
    await expect(
      service.update('p', { priceBdt: '400', discountedPriceBdt: null }, 'admin'),
    ).resolves.toMatchObject({
      effectivePriceBdt: '450.00',
      isPopular: true,
    });
  });
});
