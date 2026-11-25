import { PackageDuration, Prisma } from '@prisma/client';
import { PackagesService } from '../packages.service';

/** Plan 1 — Admin → Packages: one Recommended, safe delete, reorder. */
describe('PackagesService admin rules', () => {
  const row = (over: Record<string, unknown> = {}) => ({
    id: 'p1',
    name: '1 Year',
    duration: PackageDuration.YEARLY,
    priceBdt: new Prisma.Decimal('899'),
    discountedPriceBdt: null,
    isPopular: true,
    description: null,
    features: [],
    isActive: true,
    sortOrder: 0,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });

  function setup(counts = { orders: 0, subs: 0, events: 0 }) {
    const tx = {
      subscriptionPackage: {
        create: jest.fn().mockResolvedValue(row()),
        update: jest.fn().mockResolvedValue(row()),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        delete: jest.fn(),
      },
      paymentOrder: { count: jest.fn().mockResolvedValue(counts.orders) },
      userSubscription: { count: jest.fn().mockResolvedValue(counts.subs) },
      subscriptionEvent: { count: jest.fn().mockResolvedValue(counts.events) },
    };
    const prisma = {
      $transaction: jest.fn(async (arg: unknown) =>
        typeof arg === 'function' ? (arg as (t: typeof tx) => unknown)(tx) : arg,
      ),
      subscriptionPackage: {
        findFirst: jest.fn().mockResolvedValue(row()),
        findMany: jest.fn().mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]),
        update: jest.fn(),
      },
    };
    const service = new PackagesService(prisma as never, { record: jest.fn() } as never);
    jest.spyOn(service, 'listAdmin').mockResolvedValue([]);
    return { service, prisma, tx };
  }

  it('marking a package Recommended unmarks every other package (same transaction)', async () => {
    const { service, tx } = setup();
    await service.update('p1', { isPopular: true }, 'admin');
    expect(tx.subscriptionPackage.updateMany).toHaveBeenCalledWith({
      where: { id: { not: 'p1' }, isPopular: true },
      data: { isPopular: false },
    });
    await service.create(
      { name: '6 Months', duration: PackageDuration.SIX_MONTHS, priceBdt: '449', isPopular: true },
      'admin',
    );
    expect(tx.subscriptionPackage.updateMany).toHaveBeenCalledTimes(2);
  });

  it('editing other fields leaves the Recommended flags alone', async () => {
    const { service, tx } = setup();
    await service.update('p1', { name: 'One Year' }, 'admin');
    expect(tx.subscriptionPackage.updateMany).not.toHaveBeenCalled();
  });

  it('an unused package is hard-deleted', async () => {
    const { service, tx } = setup();
    await expect(service.remove('p1', 'admin')).resolves.toEqual({ id: 'p1', deleted: true });
    expect(tx.subscriptionPackage.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
  });

  it('a package with subscribers or payments is refused (409 PACKAGE_IN_USE), nothing deleted', async () => {
    const { service, tx } = setup({ orders: 2, subs: 1, events: 3 });
    const err = await service.remove('p1', 'admin').catch((e: unknown) => e);
    expect(err).toMatchObject({ status: 409 });
    expect(JSON.stringify((err as { getResponse(): unknown }).getResponse())).toContain(
      'PACKAGE_IN_USE',
    );
    expect(tx.subscriptionPackage.delete).not.toHaveBeenCalled();
  });

  it('reorder needs every live package exactly once and writes sortOrder by position', async () => {
    const { service, prisma } = setup();
    await expect(service.reorder(['a', 'b'], 'admin')).rejects.toMatchObject({ status: 422 });
    await service.reorder(['c', 'a', 'b'], 'admin');
    expect(prisma.subscriptionPackage.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'c' },
      data: { sortOrder: 0 },
    });
    expect(prisma.subscriptionPackage.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'b' },
      data: { sortOrder: 2 },
    });
  });
});
