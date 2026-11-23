import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SubscriptionStatus, UserRole } from '@prisma/client';
import {
  createErrorResponse,
  type AdminSubscriptionRecord,
  type AdminUserSubscriptionOverview,
} from '@your-academy/shared';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import type { GrantSubscriptionDto, RevokeSubscriptionDto } from './dto/admin-subscription.dto';

/** Plan used for Admin-granted access (seeded; recreated here if missing). */
export const ADMIN_GRANT_PLAN_CODE = 'PREMIUM';
const HISTORY_LIMIT = 20;

type SubscriptionRow = {
  id: string;
  status: SubscriptionStatus;
  startsAt: Date;
  endsAt: Date;
  canceledAt: Date | null;
  createdAt: Date;
  plan: { code: string; name: string };
};

const SUBSCRIPTION_SELECT = {
  id: true,
  status: true,
  startsAt: true,
  endsAt: true,
  canceledAt: true,
  createdAt: true,
  plan: { select: { code: true, name: true } },
} as const;

/**
 * DEC-052: Admin-only grant / revoke of learner subscriptions. Entitlement itself is
 * still decided by `AccessControlService.hasActiveSubscription` (ACTIVE + window).
 */
@Injectable()
export class AdminSubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getOverview(userId: string, now = new Date()): Promise<AdminUserSubscriptionOverview> {
    const user = await this.findTargetUser(userId);
    const rows = await this.prisma.userSubscription.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: HISTORY_LIMIT,
      select: SUBSCRIPTION_SELECT,
    });
    const history = rows.map((r) => this.toRecord(r, now));
    const current =
      history
        .filter((r) => r.isCurrent)
        .sort((a, b) => b.endsAt.localeCompare(a.endsAt))[0] ?? null;
    return {
      userId: user.id,
      role: user.role,
      isAdmin: user.role === UserRole.ADMIN,
      hasActiveSubscription: Boolean(current),
      current,
      history,
    };
  }

  /**
   * Grant replaces any ACTIVE subscription that has not yet ended (canceled in the same
   * transaction) so a learner never holds overlapping Admin grants.
   */
  async grant(
    userId: string,
    dto: GrantSubscriptionDto,
    actorUserId: string,
    ip?: string | null,
    now = new Date(),
  ): Promise<AdminUserSubscriptionOverview> {
    const user = await this.findTargetUser(userId);
    if (user.role === UserRole.ADMIN) {
      throw new ConflictException(
        createErrorResponse(
          'SUBSCRIPTION_NOT_NEEDED',
          'Admins already have full access',
          newRequestId(),
        ),
      );
    }

    const startsAt = dto.startsAt ? new Date(dto.startsAt) : now;
    const endsAt = new Date(dto.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
      throw this.invalid('SUBSCRIPTION_INVALID_DATES', 'Start and end must be valid dates');
    }
    if (endsAt.getTime() <= startsAt.getTime()) {
      throw this.invalid('SUBSCRIPTION_INVALID_DATES', 'End date must be after the start date');
    }
    if (endsAt.getTime() <= now.getTime()) {
      throw this.invalid('SUBSCRIPTION_INVALID_DATES', 'End date must be in the future');
    }
    const note = dto.note?.trim() || null;

    const { created, replacedIds } = await this.prisma.$transaction(async (tx) => {
      const plan = await tx.subscriptionPlan.upsert({
        where: { code: ADMIN_GRANT_PLAN_CODE },
        update: {},
        create: {
          code: ADMIN_GRANT_PLAN_CODE,
          name: 'Premium',
          description: 'Full access to answers and explanations',
          durationDays: 30,
          priceCents: 0,
          entitlements: ['VIEW_ANSWERS', 'VIEW_EXPLANATIONS', 'VIEW_DOCUMENTS'],
        },
        select: { id: true },
      });
      const open = await tx.userSubscription.findMany({
        where: { userId, status: SubscriptionStatus.ACTIVE, endsAt: { gt: now } },
        select: { id: true },
      });
      const ids = open.map((r) => r.id);
      if (ids.length) {
        await tx.userSubscription.updateMany({
          where: { id: { in: ids } },
          data: { status: SubscriptionStatus.CANCELED, canceledAt: now },
        });
      }
      const row = await tx.userSubscription.create({
        data: {
          userId,
          planId: plan.id,
          status: SubscriptionStatus.ACTIVE,
          startsAt,
          endsAt,
        },
        select: { id: true },
      });
      return { created: row, replacedIds: ids };
    });

    await this.audit.record({
      actorUserId,
      action: 'SUBSCRIPTION_GRANT',
      entityType: 'UserSubscription',
      entityId: created.id,
      metadata: {
        userId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        replacedSubscriptionIds: replacedIds,
        ...(note ? { note } : {}),
      },
      ipAddress: ip ?? null,
    });

    return this.getOverview(userId, now);
  }

  /** Cancels every ACTIVE subscription that has not yet ended (current or scheduled). */
  async revoke(
    userId: string,
    dto: RevokeSubscriptionDto,
    actorUserId: string,
    ip?: string | null,
    now = new Date(),
  ): Promise<AdminUserSubscriptionOverview> {
    await this.findTargetUser(userId);
    const note = dto.note?.trim() || null;

    const revokedIds = await this.prisma.$transaction(async (tx) => {
      const open = await tx.userSubscription.findMany({
        where: { userId, status: SubscriptionStatus.ACTIVE, endsAt: { gt: now } },
        select: { id: true },
      });
      const ids = open.map((r) => r.id);
      if (ids.length) {
        await tx.userSubscription.updateMany({
          where: { id: { in: ids } },
          data: { status: SubscriptionStatus.CANCELED, canceledAt: now },
        });
      }
      return ids;
    });

    if (!revokedIds.length) {
      throw new NotFoundException(
        createErrorResponse(
          'SUBSCRIPTION_NOT_FOUND',
          'This user has no active subscription to revoke',
          newRequestId(),
        ),
      );
    }

    await this.audit.record({
      actorUserId,
      action: 'SUBSCRIPTION_REVOKE',
      entityType: 'UserSubscription',
      entityId: revokedIds[0],
      metadata: { userId, revokedSubscriptionIds: revokedIds, ...(note ? { note } : {}) },
      ipAddress: ip ?? null,
    });

    return this.getOverview(userId, now);
  }

  private async findTargetUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!user) {
      throw new NotFoundException(
        createErrorResponse('USER_NOT_FOUND', 'User not found', newRequestId()),
      );
    }
    return user;
  }

  private invalid(code: string, message: string) {
    return new UnprocessableEntityException(createErrorResponse(code, message, newRequestId()));
  }

  private toRecord(row: SubscriptionRow, now: Date): AdminSubscriptionRecord {
    return {
      id: row.id,
      planCode: row.plan.code,
      planName: row.plan.name,
      status: row.status,
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      canceledAt: row.canceledAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      isCurrent:
        row.status === SubscriptionStatus.ACTIVE &&
        row.startsAt.getTime() <= now.getTime() &&
        row.endsAt.getTime() > now.getTime(),
    };
  }
}
