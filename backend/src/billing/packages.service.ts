import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PackageDuration, Prisma } from '@prisma/client';
import {
  SELLABLE_PACKAGE_DURATIONS,
  createErrorResponse,
  type AdminSubscriptionPackageDto,
  type SubscriptionPackageDto,
} from '@your-academy/shared';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';

export type PackageInput = {
  name: string;
  duration: PackageDuration;
  /** Decimal string, e.g. "499" or "499.50". */
  priceBdt: string;
  /** Sale price (below priceBdt); null clears it. */
  discountedPriceBdt?: string | null;
  isPopular?: boolean;
  description?: string | null;
  features?: string[];
  isActive?: boolean;
  sortOrder?: number;
};

type PackageRow = Prisma.SubscriptionPackageGetPayload<object>;

/** What checkout charges (DEC-062): the sale price when one is set. */
export function effectivePrice(p: {
  priceBdt: Prisma.Decimal;
  discountedPriceBdt: Prisma.Decimal | null;
}): Prisma.Decimal {
  return p.discountedPriceBdt ?? p.priceBdt;
}

/** DEC-060 — admin-managed packages; soft-deleted once any order references them. */
@Injectable()
export class PackagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listActive(): Promise<SubscriptionPackageDto[]> {
    const rows = await this.prisma.subscriptionPackage.findMany({
      where: { isActive: true, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { priceBdt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  async listAdmin(): Promise<AdminSubscriptionPackageDto[]> {
    const rows = await this.prisma.subscriptionPackage.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      include: { _count: { select: { orders: true } } },
    });
    return rows.map((r) => ({ ...this.toDto(r), orderCount: r._count.orders }));
  }

  async create(input: PackageInput, actorUserId: string): Promise<SubscriptionPackageDto> {
    this.assertDiscount(input.priceBdt, input.discountedPriceBdt ?? null);
    const row = await this.prisma.$transaction(async (tx) => {
      const created = await tx.subscriptionPackage.create({ data: this.toData(input) });
      if (created.isPopular) await this.unmarkOtherPopular(tx, created.id);
      return created;
    });
    await this.audit.record({
      actorUserId,
      action: 'PACKAGE_CREATE',
      entityType: 'SubscriptionPackage',
      entityId: row.id,
      metadata: { name: row.name, duration: row.duration, priceBdt: row.priceBdt.toFixed(2) },
    });
    return this.toDto(row);
  }

  /** Price edits never touch existing orders — each order stores its own amount. */
  async update(
    id: string,
    input: Partial<PackageInput>,
    actorUserId: string,
  ): Promise<SubscriptionPackageDto> {
    const current = await this.findLive(id);
    if (
      input.duration !== undefined &&
      input.duration !== current.duration &&
      !SELLABLE_PACKAGE_DURATIONS.includes(input.duration)
    ) {
      throw new UnprocessableEntityException(
        createErrorResponse(
          'PACKAGE_DURATION_RETIRED',
          'Monthly plans are no longer sold — choose 3 Months, 6 Months or 1 Year',
          newRequestId(),
        ),
      );
    }
    if (input.priceBdt !== undefined || input.discountedPriceBdt !== undefined) {
      this.assertDiscount(
        input.priceBdt ?? current.priceBdt.toFixed(2),
        input.discountedPriceBdt === undefined
          ? (current.discountedPriceBdt?.toFixed(2) ?? null)
          : input.discountedPriceBdt,
      );
    }
    const row = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.subscriptionPackage.update({
        where: { id },
        data: this.toData(input),
      });
      if (input.isPopular === true) await this.unmarkOtherPopular(tx, id);
      return updated;
    });
    await this.audit.record({
      actorUserId,
      action: 'PACKAGE_UPDATE',
      entityType: 'SubscriptionPackage',
      entityId: id,
      metadata: JSON.parse(JSON.stringify(input)) as Prisma.InputJsonValue,
    });
    return this.toDto(row);
  }

  /**
   * Hard delete only a package nobody ever bought or was given. One with orders, subscriptions
   * or history is refused (409 PACKAGE_IN_USE) — the admin deactivates it instead, which hides
   * it from the homepage and /packages but keeps every record.
   */
  async remove(id: string, actorUserId: string): Promise<{ id: string; deleted: true }> {
    await this.findLive(id);
    await this.prisma.$transaction(async (tx) => {
      const [orders, subscribers, events] = await Promise.all([
        tx.paymentOrder.count({ where: { packageId: id } }),
        tx.userSubscription.count({
          where: { OR: [{ packageId: id }, { scheduledPackageId: id }] },
        }),
        tx.subscriptionEvent.count({ where: { packageId: id } }),
      ]);
      if (orders || subscribers || events) {
        throw new ConflictException(
          createErrorResponse(
            'PACKAGE_IN_USE',
            `This package can't be deleted: it has ${subscribers} subscriber(s) and ${orders} payment(s) on record. Deactivate it instead — it disappears from the homepage and Packages page, and all history is kept.`,
            newRequestId(),
            [{ subscribers, orders, events }],
          ),
        );
      }
      await tx.subscriptionPackage.delete({ where: { id } });
    });
    await this.audit.record({
      actorUserId,
      action: 'PACKAGE_DELETE',
      entityType: 'SubscriptionPackage',
      entityId: id,
    });
    return { id, deleted: true };
  }

  /** `ids` = every live package in the new display order (homepage + /packages follow it). */
  async reorder(ids: string[], actorUserId: string): Promise<AdminSubscriptionPackageDto[]> {
    const live = await this.prisma.subscriptionPackage.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });
    const known = new Set(live.map((r) => r.id));
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((i) => known.has(i))
    ) {
      throw new UnprocessableEntityException(
        createErrorResponse(
          'PACKAGE_ORDER_INVALID',
          'Send every package exactly once',
          newRequestId(),
        ),
      );
    }
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.subscriptionPackage.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    await this.audit.record({
      actorUserId,
      action: 'PACKAGE_REORDER',
      entityType: 'SubscriptionPackage',
      metadata: { ids },
    });
    return this.listAdmin();
  }

  /** Only one package carries the Recommended / Popular badge at a time. */
  private unmarkOtherPopular(tx: Prisma.TransactionClient, keepId: string) {
    return tx.subscriptionPackage.updateMany({
      where: { id: { not: keepId }, isPopular: true },
      data: { isPopular: false },
    });
  }

  /** Package a learner may buy right now (active, not deleted). */
  async findPurchasable(id: string) {
    const pkg = await this.prisma.subscriptionPackage.findFirst({
      where: { id, isActive: true, deletedAt: null },
    });
    if (!pkg) {
      throw new NotFoundException(
        createErrorResponse('PACKAGE_NOT_FOUND', 'This package is not available', newRequestId()),
      );
    }
    return pkg;
  }

  private async findLive(id: string) {
    const pkg = await this.prisma.subscriptionPackage.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, duration: true, priceBdt: true, discountedPriceBdt: true },
    });
    if (!pkg) {
      throw new NotFoundException(
        createErrorResponse('PACKAGE_NOT_FOUND', 'Package not found', newRequestId()),
      );
    }
    return pkg;
  }

  /** A sale price must be a real discount — otherwise the card would show a fake one. */
  private assertDiscount(price: string, discounted: string | null) {
    if (discounted === null) return;
    if (!new Prisma.Decimal(discounted).lt(new Prisma.Decimal(price))) {
      throw new UnprocessableEntityException(
        createErrorResponse(
          'PACKAGE_DISCOUNT_INVALID',
          'The discounted price must be lower than the regular price',
          newRequestId(),
        ),
      );
    }
  }

  private toData(input: Partial<PackageInput>) {
    return {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.duration !== undefined ? { duration: input.duration } : {}),
      ...(input.priceBdt !== undefined ? { priceBdt: new Prisma.Decimal(input.priceBdt) } : {}),
      ...(input.discountedPriceBdt !== undefined
        ? {
            discountedPriceBdt:
              input.discountedPriceBdt === null
                ? null
                : new Prisma.Decimal(input.discountedPriceBdt),
          }
        : {}),
      ...(input.isPopular !== undefined ? { isPopular: input.isPopular } : {}),
      ...(input.description !== undefined
        ? { description: input.description?.trim() || null }
        : {}),
      ...(input.features !== undefined
        ? { features: input.features.map((f) => f.trim()).filter(Boolean) }
        : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    } as Prisma.SubscriptionPackageCreateInput;
  }

  toDto(r: PackageRow): SubscriptionPackageDto {
    return {
      id: r.id,
      name: r.name,
      duration: r.duration,
      priceBdt: r.priceBdt.toFixed(2),
      discountedPriceBdt: r.discountedPriceBdt?.toFixed(2) ?? null,
      effectivePriceBdt: effectivePrice(r).toFixed(2),
      isPopular: r.isPopular,
      description: r.description,
      features: r.features,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
