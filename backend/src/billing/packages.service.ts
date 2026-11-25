import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
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
    const row = await this.prisma.subscriptionPackage.create({ data: this.toData(input) });
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
    const row = await this.prisma.subscriptionPackage.update({
      where: { id },
      data: this.toData(input),
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

  async remove(id: string, actorUserId: string): Promise<{ id: string; softDeleted: boolean }> {
    await this.findLive(id);
    const softDeleted = await this.prisma.$transaction(async (tx) => {
      const used =
        (await tx.paymentOrder.count({ where: { packageId: id } })) > 0 ||
        (await tx.subscriptionEvent.count({ where: { packageId: id } })) > 0 ||
        (await tx.userSubscription.count({ where: { packageId: id } })) > 0;
      if (used) {
        await tx.subscriptionPackage.update({
          where: { id },
          data: { deletedAt: new Date(), isActive: false },
        });
        return true;
      }
      await tx.subscriptionPackage.delete({ where: { id } });
      return false;
    });
    await this.audit.record({
      actorUserId,
      action: softDeleted ? 'PACKAGE_SOFT_DELETE' : 'PACKAGE_DELETE',
      entityType: 'SubscriptionPackage',
      entityId: id,
    });
    return { id, softDeleted };
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
