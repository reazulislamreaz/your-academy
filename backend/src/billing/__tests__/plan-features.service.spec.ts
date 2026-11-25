import 'reflect-metadata';
import { PlanKey } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { resolvePlanFeatureLabel } from '@your-academy/shared';
import { CreatePlanFeatureDto } from '../dto/billing.dto';
import { PlanFeaturesService } from '../plan-features.service';

describe('PlanFeaturesService (DEC-065, display only)', () => {
  const row = (planKey: PlanKey, label: string, sortOrder: number, extra = {}) => ({
    id: `${planKey}-${sortOrder}`,
    planKey,
    label,
    isIncluded: true,
    isActive: true,
    sortOrder,
    createdAt: new Date('2026-11-26T00:00:00Z'),
    updatedAt: new Date('2026-11-26T00:00:00Z'),
    ...extra,
  });

  function setup(opts: { rows?: unknown[]; packages?: unknown[]; paidOn?: boolean } = {}) {
    const prisma = {
      planFeature: {
        findMany: jest.fn().mockResolvedValue(opts.rows ?? []),
        aggregate: jest.fn().mockResolvedValue({ _max: { sortOrder: 4 } }),
        create: jest.fn(async ({ data }: { data: object }) => ({
          ...row(PlanKey.FREE, '', 0),
          ...data,
        })),
        update: jest.fn(async ({ data }: { data: object }) => ({
          ...row(PlanKey.FREE, 'x', 0),
          ...data,
        })),
        findUnique: jest.fn().mockResolvedValue(row(PlanKey.FREE, 'x', 0)),
        delete: jest.fn(),
      },
      $transaction: jest.fn(async (ops: unknown[]) => ops),
    };
    const settings = {
      get: jest.fn().mockResolvedValue({
        paidSystemEnabled: opts.paidOn ?? true,
        preliFreeSetCount: 12,
        writtenFreeSetCount: 5,
      }),
    };
    const packages = { listActive: jest.fn().mockResolvedValue(opts.packages ?? []) };
    const audit = { record: jest.fn() };
    const service = new PlanFeaturesService(
      prisma as never,
      audit as never,
      settings as never,
      packages as never,
    );
    return { service, prisma, audit };
  }

  it('fills placeholders from live settings (Bangla digits for Bangla labels)', () => {
    const v = { preliFreeSets: 12, writtenFreeSets: 5, topicTrialDays: 7 };
    expect(resolvePlanFeatureLabel('First {preliFreeSets} Preli sets', v)).toBe(
      'First 12 Preli sets',
    );
    expect(resolvePlanFeatureLabel('প্রথম {preliFreeSets}টি সেট, {topicTrialDays} দিন', v)).toBe(
      'প্রথম ১২টি সেট, ৭ দিন',
    );
    expect(resolvePlanFeatureLabel('No {unknown} token', v)).toBe('No {unknown} token');
  });

  it('comparison: active rows only, split by plan, cheapest package by charged price', async () => {
    const { service, prisma } = setup({
      rows: [
        row(PlanKey.FREE, 'First {writtenFreeSets} Written sets', 0),
        row(PlanKey.PAID, 'Every set', 0),
        row(PlanKey.FREE, 'All sets', 1, { isIncluded: false }),
      ],
      packages: [
        { name: '1 Year', duration: 'YEARLY', priceBdt: '2000.00', effectivePriceBdt: '1500.00' },
        {
          name: '3 Months',
          duration: 'THREE_MONTHS',
          priceBdt: '897.00',
          effectivePriceBdt: '897.00',
        },
      ],
    });
    const c = await service.comparison();
    expect(prisma.planFeature.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { isActive: true } }),
    );
    expect(c.free.features).toEqual([
      { id: 'FREE-0', label: 'First 5 Written sets', isIncluded: true },
      { id: 'FREE-1', label: 'All sets', isIncluded: false },
    ]);
    expect(c.paid.features.map((f) => f.label)).toEqual(['Every set']);
    expect(c.paid.cheapest).toMatchObject({ name: '3 Months', effectivePriceBdt: '897.00' });
    expect(c.paid.packageCount).toBe(2);
    // Every active package, in the admin's order (listActive is already sorted).
    expect(c.paid.packages.map((p) => p.name)).toEqual(['1 Year', '3 Months']);
    expect(c).toMatchObject({ paidSystemEnabled: true, paymentsConfigured: false });
  });

  it('comparison with no rows / no packages still answers (homepage falls back)', async () => {
    const c = await setup({ paidOn: false }).service.comparison();
    expect(c).toMatchObject({
      paidSystemEnabled: false,
      free: { features: [] },
      paid: { features: [], cheapest: null, packageCount: 0, packages: [] },
    });
  });

  it('create appends to the end of its plan, trims, and audits', async () => {
    const { service, prisma, audit } = setup();
    const dto = await service.create({ planKey: PlanKey.PAID, label: '  বাংলা   ফিচার ' }, 'admin');
    expect(prisma.planFeature.create).toHaveBeenCalledWith({
      data: {
        planKey: 'PAID',
        label: 'বাংলা ফিচার',
        isIncluded: true,
        isActive: true,
        sortOrder: 5,
      },
    });
    expect(dto.label).toBe('বাংলা ফিচার');
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'PLAN_FEATURE_CREATE' }),
    );
  });

  it('rejects an empty / too-long label (422)', async () => {
    const { service } = setup();
    await expect(
      service.create({ planKey: PlanKey.FREE, label: '   ' }, 'a'),
    ).rejects.toMatchObject({ status: 422 });
    await expect(service.update('x', { label: 'x'.repeat(201) }, 'a')).rejects.toMatchObject({
      status: 422,
    });
  });

  it('reorder requires the full list of that plan, each id once', async () => {
    const { service, prisma } = setup({
      rows: [
        { ...row(PlanKey.FREE, 'A', 0), id: 'a' },
        { ...row(PlanKey.FREE, 'B', 1), id: 'b' },
      ],
    });
    await expect(service.reorder(PlanKey.FREE, ['a'], 'x')).rejects.toMatchObject({ status: 422 });
    await expect(service.reorder(PlanKey.FREE, ['a', 'a'], 'x')).rejects.toMatchObject({
      status: 422,
    });
    await service.reorder(PlanKey.FREE, ['b', 'a'], 'x');
    expect(prisma.planFeature.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'b' },
      data: { sortOrder: 0 },
    });
    expect(prisma.planFeature.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'a' },
      data: { sortOrder: 1 },
    });
  });

  it('DTO validation: plan key must be FREE/PAID, label 1–200 chars', async () => {
    const errs = async (body: object) =>
      (await validate(plainToInstance(CreatePlanFeatureDto, body))).map((e) => e.property);
    expect(await errs({ planKey: 'FREE', label: 'ok' })).toEqual([]);
    expect(await errs({ planKey: 'GOLD', label: 'ok' })).toEqual(['planKey']);
    expect(await errs({ planKey: 'PAID', label: '' })).toEqual(['label']);
    expect(await errs({ planKey: 'PAID', label: 'x'.repeat(201) })).toEqual(['label']);
  });
});
