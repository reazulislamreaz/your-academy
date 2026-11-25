import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { PlanKey, Prisma } from '@prisma/client';
import {
  PLAN_FEATURE_LABEL_MAX,
  TOPIC_TRIAL_DAYS,
  createErrorResponse,
  resolvePlanFeatureLabel,
  type AdminPlanFeatureDto,
  type PlanComparisonDto,
  type PlanFeatureDto,
} from '@your-academy/shared';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { PackagesService } from './packages.service';
import { SiteSettingsService } from './site-settings.service';
import { getSslcommerzConfig } from './sslcommerz/sslcommerz.config';

export type PlanFeatureInput = {
  planKey: PlanKey;
  label: string;
  isIncluded?: boolean;
  isActive?: boolean;
};

type Row = Prisma.PlanFeatureGetPayload<object>;

/**
 * DEC-065 — Free vs Paid rows for the homepage "Access & Pricing" cards. Informational only:
 * nothing here grants or denies access (that stays in AccessPolicyService).
 */
@Injectable()
export class PlanFeaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly settings: SiteSettingsService,
    private readonly packages: PackagesService,
  ) {}

  /** Public: active rows with live numbers filled in, plus the cheapest paid package. */
  async comparison(): Promise<PlanComparisonDto> {
    const [rows, s, onSale] = await Promise.all([
      this.prisma.planFeature.findMany({
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
      }),
      this.settings.get(),
      this.packages.listActive(),
    ]);
    const values = {
      preliFreeSets: s.preliFreeSetCount,
      writtenFreeSets: s.writtenFreeSetCount,
      topicTrialDays: TOPIC_TRIAL_DAYS,
    };
    const pick = (key: PlanKey): PlanFeatureDto[] =>
      rows
        .filter((r) => r.planKey === key)
        .map((r) => ({
          id: r.id,
          label: resolvePlanFeatureLabel(r.label, values),
          isIncluded: r.isIncluded,
        }));
    const cheapest =
      [...onSale].sort((a, b) => Number(a.effectivePriceBdt) - Number(b.effectivePriceBdt))[0] ??
      null;
    return {
      paidSystemEnabled: s.paidSystemEnabled,
      paymentsConfigured: getSslcommerzConfig() !== null,
      free: { features: pick(PlanKey.FREE) },
      paid: {
        features: pick(PlanKey.PAID),
        cheapest: cheapest
          ? {
              name: cheapest.name,
              duration: cheapest.duration,
              priceBdt: cheapest.priceBdt,
              effectivePriceBdt: cheapest.effectivePriceBdt,
            }
          : null,
        packageCount: onSale.length,
        packages: onSale,
      },
    };
  }

  async listAdmin(): Promise<AdminPlanFeatureDto[]> {
    const rows = await this.prisma.planFeature.findMany({
      orderBy: [{ planKey: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => this.toDto(r));
  }

  /** New rows go to the end of their plan's list. */
  async create(input: PlanFeatureInput, actorUserId: string): Promise<AdminPlanFeatureDto> {
    const label = this.cleanLabel(input.label);
    const last = await this.prisma.planFeature.aggregate({
      where: { planKey: input.planKey },
      _max: { sortOrder: true },
    });
    const row = await this.prisma.planFeature.create({
      data: {
        planKey: input.planKey,
        label,
        isIncluded: input.isIncluded ?? true,
        isActive: input.isActive ?? true,
        sortOrder: (last._max.sortOrder ?? -1) + 1,
      },
    });
    await this.record(actorUserId, 'PLAN_FEATURE_CREATE', row.id, { planKey: row.planKey, label });
    return this.toDto(row);
  }

  async update(
    id: string,
    input: Partial<Omit<PlanFeatureInput, 'planKey'>>,
    actorUserId: string,
  ): Promise<AdminPlanFeatureDto> {
    await this.find(id);
    const row = await this.prisma.planFeature.update({
      where: { id },
      data: {
        ...(input.label !== undefined ? { label: this.cleanLabel(input.label) } : {}),
        ...(input.isIncluded !== undefined ? { isIncluded: input.isIncluded } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      },
    });
    await this.record(actorUserId, 'PLAN_FEATURE_UPDATE', id, { ...input });
    return this.toDto(row);
  }

  async remove(id: string, actorUserId: string): Promise<{ id: string }> {
    const row = await this.find(id);
    await this.prisma.planFeature.delete({ where: { id } });
    await this.record(actorUserId, 'PLAN_FEATURE_DELETE', id, {
      planKey: row.planKey,
      label: row.label,
    });
    return { id };
  }

  /** `ids` = the plan's complete list in its new order (rows of other plans are untouched). */
  async reorder(planKey: PlanKey, ids: string[], actorUserId: string) {
    const current = await this.prisma.planFeature.findMany({
      where: { planKey },
      select: { id: true },
    });
    const known = new Set(current.map((r) => r.id));
    if (
      ids.length !== known.size ||
      new Set(ids).size !== ids.length ||
      !ids.every((i) => known.has(i))
    ) {
      throw new UnprocessableEntityException(
        createErrorResponse(
          'PLAN_FEATURE_ORDER_INVALID',
          'Send every feature of this plan exactly once',
          newRequestId(),
        ),
      );
    }
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.planFeature.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    await this.record(actorUserId, 'PLAN_FEATURE_REORDER', planKey, { ids });
    return this.listAdmin();
  }

  private cleanLabel(raw: string): string {
    const label = raw.normalize('NFC').trim().replace(/\s+/g, ' ');
    if (!label || label.length > PLAN_FEATURE_LABEL_MAX) {
      throw new UnprocessableEntityException(
        createErrorResponse(
          'PLAN_FEATURE_LABEL_INVALID',
          `Feature text is required (max ${PLAN_FEATURE_LABEL_MAX} characters)`,
          newRequestId(),
        ),
      );
    }
    return label;
  }

  private async find(id: string) {
    const row = await this.prisma.planFeature.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException(
        createErrorResponse('PLAN_FEATURE_NOT_FOUND', 'Feature not found', newRequestId()),
      );
    }
    return row;
  }

  private record(actorUserId: string, action: string, entityId: string, metadata: object) {
    return this.audit.record({
      actorUserId,
      action,
      entityType: 'PlanFeature',
      entityId,
      metadata: JSON.parse(JSON.stringify(metadata)) as Prisma.InputJsonValue,
    });
  }

  private toDto(r: Row): AdminPlanFeatureDto {
    return {
      id: r.id,
      planKey: r.planKey,
      label: r.label,
      isIncluded: r.isIncluded,
      isActive: r.isActive,
      sortOrder: r.sortOrder,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }
}
