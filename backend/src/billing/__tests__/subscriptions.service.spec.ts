import { PackageDuration, SubscriptionEventAction, SubscriptionEventSource } from '@prisma/client';
import { SubscriptionsService, addMonths, subscriptionState } from '../subscriptions.service';

describe('SubscriptionsService (DEC-060)', () => {
  const now = new Date('2026-11-24T12:00:00.000Z');

  describe('addMonths', () => {
    it('adds calendar months and clamps to month end', () => {
      expect(addMonths(new Date('2026-01-31T10:00:00Z'), 1).toISOString()).toBe(
        '2026-02-28T10:00:00.000Z',
      );
      expect(addMonths(new Date('2026-08-31T00:00:00Z'), 6).toISOString()).toBe(
        '2027-02-28T00:00:00.000Z',
      );
      expect(addMonths(new Date('2026-11-24T12:00:00Z'), 12).toISOString()).toBe(
        '2027-11-24T12:00:00.000Z',
      );
    });
  });

  describe('subscriptionState', () => {
    const base = {
      startsAt: new Date('2026-11-01T00:00:00Z'),
      endsAt: new Date('2026-12-01T00:00:00Z'),
      disabledAt: null,
      package: null,
    };
    it('derives FREE / ACTIVE / SCHEDULED / EXPIRED / DISABLED', () => {
      expect(subscriptionState(null, now)).toBe('FREE');
      expect(subscriptionState(base, now)).toBe('ACTIVE');
      expect(subscriptionState({ ...base, startsAt: new Date('2026-11-30T00:00:00Z') }, now)).toBe(
        'SCHEDULED',
      );
      expect(subscriptionState({ ...base, endsAt: now }, now)).toBe('EXPIRED');
      expect(subscriptionState({ ...base, disabledAt: now }, now)).toBe('DISABLED');
    });
  });

  describe('applyPurchase', () => {
    function makeTx(
      current: { endsAt: Date; disabledAt: Date | null; packageId: string | null } | null,
    ) {
      return {
        $queryRaw: jest.fn().mockResolvedValue([]),
        userSubscription: {
          findUnique: jest.fn().mockResolvedValue(current),
          upsert: jest.fn().mockResolvedValue({}),
        },
        subscriptionEvent: { create: jest.fn().mockResolvedValue({}) },
      };
    }
    const service = new SubscriptionsService({} as never, { record: jest.fn() } as never);
    const order = { id: 'o1', userId: 'u1', packageId: 'pkg', duration: PackageDuration.MONTHLY };

    it('active subscriber: new duration is added to the current end date (not reset)', async () => {
      const tx = makeTx({
        endsAt: new Date('2026-12-10T00:00:00Z'),
        disabledAt: null,
        packageId: 'old',
      });
      const end = await service.applyPurchase(tx as never, order, now);
      expect(end.toISOString()).toBe('2027-01-10T00:00:00.000Z');
      const upsert = tx.userSubscription.upsert.mock.calls[0][0];
      expect(upsert.update).not.toHaveProperty('startsAt');
      expect(upsert.update).toMatchObject({ disabledAt: null, packageId: 'pkg' });
    });

    it('expired subscriber: starts again from now', async () => {
      const tx = makeTx({
        endsAt: new Date('2026-10-01T00:00:00Z'),
        disabledAt: null,
        packageId: 'old',
      });
      const end = await service.applyPurchase(
        tx as never,
        { ...order, duration: PackageDuration.SIX_MONTHS },
        now,
      );
      expect(end.toISOString()).toBe('2027-05-24T12:00:00.000Z');
      expect(tx.userSubscription.upsert.mock.calls[0][0].update.startsAt).toEqual(now);
    });

    it('first purchase creates the row and logs a PAYMENT / PURCHASE event', async () => {
      const tx = makeTx(null);
      await service.applyPurchase(tx as never, { ...order, duration: PackageDuration.YEARLY }, now);
      expect(tx.userSubscription.upsert.mock.calls[0][0].create).toMatchObject({
        userId: 'u1',
        startsAt: now,
        packageId: 'pkg',
      });
      expect(tx.subscriptionEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          source: SubscriptionEventSource.PAYMENT,
          action: SubscriptionEventAction.PURCHASE,
          paymentOrderId: 'o1',
          previousEndsAt: null,
          newEndsAt: new Date('2027-11-24T12:00:00.000Z'),
        }),
      });
    });

    it('locks the user row before reading the subscription', async () => {
      const tx = makeTx(null);
      await service.applyPurchase(tx as never, order, now);
      expect(tx.$queryRaw).toHaveBeenCalled();
      expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
        tx.userSubscription.findUnique.mock.invocationCallOrder[0],
      );
    });
  });
});
