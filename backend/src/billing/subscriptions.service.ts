import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  PackageDuration,
  Prisma,
  SubscriptionEventAction,
  SubscriptionEventSource,
  UserRole,
} from '@prisma/client';
import {
  PACKAGE_DURATION_MONTHS,
  createErrorResponse,
  type AdminSubscriberRow,
  type AdminUserSubscriptionDetail,
  type MyBillingDetail,
  type MySubscriptionDto,
  type PaymentOrderDto,
  type PlanChangeKind,
  type SubscriptionEventDto,
  type SubscriptionState,
  type SubscriptionSummary,
} from '@your-academy/shared';
import { AuditService } from '../audit/audit.service';
import { paginateById } from '../common/pagination';
import { newRequestId } from '../common/request-id';
import { LearningActivityService } from '../learning-activity/learning-activity.service';
import { PrismaService } from '../database/prisma.service';
import { PackagesService, effectivePrice } from './packages.service';

type Tx = Prisma.TransactionClient;

type SubscriptionRow = {
  startsAt: Date;
  endsAt: Date;
  disabledAt: Date | null;
  package: { name: string } | null;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: Date | null;
  scheduledPackage?: { name: string } | null;
};

const SUB_SELECT = {
  startsAt: true,
  endsAt: true,
  disabledAt: true,
  package: { select: { name: true } },
  cancelAtPeriodEnd: true,
  canceledAt: true,
  scheduledPackage: { select: { name: true } },
} as const;

/** endsAt changed → a new period: its 7- and 3-day reminders may be sent again (DEC-062). */
const RESET_REMINDERS = { reminder7DaysSentAt: null, reminder3DaysSentAt: null } as const;

type PlanRef = {
  id: string;
  duration: PackageDuration;
  priceBdt: Prisma.Decimal;
  discountedPriceBdt: Prisma.Decimal | null;
};

/**
 * DEC-062 — longer plan (or same length at a higher price) = UPGRADE, paid now and added on
 * top of the remaining time; anything else = DOWNGRADE, scheduled for the next renewal.
 * `current` is null when nothing is running (or the plan is unknown) → every option is NEW.
 */
export function classifyPlanChange(current: PlanRef | null, candidate: PlanRef): PlanChangeKind {
  if (!current) return 'NEW';
  if (candidate.id === current.id) return 'RENEW';
  const cm = PACKAGE_DURATION_MONTHS[current.duration];
  const nm = PACKAGE_DURATION_MONTHS[candidate.duration];
  if (nm !== cm) return nm > cm ? 'UPGRADE' : 'DOWNGRADE';
  return effectivePrice(candidate).gt(effectivePrice(current)) ? 'UPGRADE' : 'DOWNGRADE';
}

const HISTORY_LIMIT = 50;
/** Admin "extend by days" bounds (~10 years). */
export const MAX_EXTEND_DAYS = 3650;

/** Calendar months (Jan 31 + 1 month → Feb 28/29, never spills into March). */
export function addMonths(from: Date, months: number): Date {
  const d = new Date(from.getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

export function subscriptionState(
  row: SubscriptionRow | null,
  now = new Date(),
): SubscriptionState {
  if (!row) return 'FREE';
  if (row.disabledAt) return 'DISABLED';
  if (row.endsAt.getTime() <= now.getTime()) return 'EXPIRED';
  if (row.startsAt.getTime() > now.getTime()) return 'SCHEDULED';
  return 'ACTIVE';
}

export type SubscriberListParams = {
  q?: string;
  state?: SubscriptionState;
  packageId?: string;
  cursor?: string;
  limit: number;
};

export type ManualGrantInput = { packageId?: string; endsAt?: string; note?: string };

/**
 * DEC-060 — one subscription row per user, changed only through here so every change is
 * written to `subscription_events` in the same transaction.
 */
@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly packages: PackagesService,
    /** DEC-067 — activity feed (optional for unit tests). */
    private readonly activity?: LearningActivityService,
  ) {}

  // ─── Reads ──────────────────────────────────────────────────────────────────

  async getMine(userId: string, role: UserRole, now = new Date()): Promise<MySubscriptionDto> {
    const [sub, payments] = await Promise.all([
      this.prisma.userSubscription.findUnique({
        where: { userId },
        select: {
          ...SUB_SELECT,
          packageId: true,
          package: {
            select: {
              name: true,
              id: true,
              duration: true,
              priceBdt: true,
              discountedPriceBdt: true,
            },
          },
          scheduledPackage: true,
        },
      }),
      this.prisma.paymentOrder.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: HISTORY_LIMIT,
      }),
    ]);
    const isAdmin = role === UserRole.ADMIN;
    const summary = this.toSummary(sub, now);
    const onSale = isAdmin ? [] : await this.packages.listActive();
    const running = summary.state === 'ACTIVE' || summary.state === 'SCHEDULED';
    const current = running && sub?.package ? sub.package : null;
    const sale = (id: string | null | undefined) => onSale.find((p) => p.id === id) ?? null;
    const scheduled = sub?.scheduledPackage ?? null;

    const billing: MyBillingDetail = {
      packageId: sub?.packageId ?? null,
      scheduledPackage: scheduled ? this.packages.toDto(scheduled) : null,
      renewalPackage: sale(scheduled?.id) ?? sale(sub?.packageId),
      options: onSale.map((p) => ({
        package: p,
        change: classifyPlanChange(current, {
          id: p.id,
          duration: p.duration,
          priceBdt: new Prisma.Decimal(p.priceBdt),
          discountedPriceBdt:
            p.discountedPriceBdt === null ? null : new Prisma.Decimal(p.discountedPriceBdt),
        }),
      })),
    };
    return {
      isAdmin,
      subscription: summary,
      payments: payments.map((p) => this.toPaymentDto(p)),
      billing,
    };
  }

  async listSubscribers(params: SubscriberListParams, now = new Date()) {
    const q = params.q?.trim();
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { whatsappNumber: { contains: q } },
              { email: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    if (params.state === 'FREE') {
      // A package filter cannot match users without a subscription.
      if (params.packageId) return { items: [], nextCursor: null, total: 0 };
      where.subscription = { is: null };
    } else if (params.state || params.packageId) {
      where.subscription = {
        is: {
          ...this.stateSubWhere(params.state, now),
          ...(params.packageId ? { packageId: params.packageId } : {}),
        },
      };
    }
    const rows = await this.prisma.user.findMany({
      where,
      take: params.limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        email: true,
        role: true,
        createdAt: true,
        subscription: { select: SUB_SELECT },
      },
    });
    const page = paginateById(rows, params.limit);
    const total = await this.prisma.user.count({ where });
    return {
      items: page.items.map((u) => this.toSubscriberRow(u, now)),
      nextCursor: page.nextCursor,
      total,
    };
  }

  async getUserDetail(userId: string, now = new Date()): Promise<AdminUserSubscriptionDetail> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        email: true,
        role: true,
        createdAt: true,
        subscription: { select: SUB_SELECT },
      },
    });
    if (!user) throw this.notFound('USER_NOT_FOUND', 'User not found');
    const [events, payments] = await Promise.all([
      this.prisma.subscriptionEvent.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: HISTORY_LIMIT,
        include: {
          actor: { select: { id: true, name: true } },
          package: { select: { name: true } },
          paymentOrder: { select: { tranId: true } },
        },
      }),
      this.prisma.paymentOrder.findMany({
        where: { userId },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: HISTORY_LIMIT,
      }),
    ]);
    return {
      ...this.toSubscriberRow(user, now),
      events: events.map((e): SubscriptionEventDto => ({
        id: e.id,
        source: e.source,
        action: e.action,
        packageName: e.package?.name ?? null,
        tranId: e.paymentOrder?.tranId ?? null,
        previousEndsAt: e.previousEndsAt?.toISOString() ?? null,
        newEndsAt: e.newEndsAt?.toISOString() ?? null,
        note: e.note,
        actor: e.actor,
        createdAt: e.createdAt.toISOString(),
      })),
      payments: payments.map((p) => this.toPaymentDto(p)),
    };
  }

  // ─── Payment (called by PaymentsService inside its transaction) ─────────────

  /**
   * Adds the package duration: from the current end date when the user is still subscribed
   * (renewal never shortens), otherwise from now. Re-enables a disabled subscription — the
   * user just paid for it. Caller holds the order row lock, so this runs once per order.
   */
  async applyPurchase(
    tx: Tx,
    order: { id: string; userId: string; packageId: string; duration: PackageDuration },
    now: Date,
  ): Promise<Date> {
    const months = PACKAGE_DURATION_MONTHS[order.duration];
    return this.extendWithin(tx, {
      userId: order.userId,
      packageId: order.packageId,
      now,
      computeEnd: (base) => addMonths(base, months),
      // Paying = renewing: a cancellation or scheduled downgrade is settled by this purchase.
      clearRenewalChoices: true,
      event: {
        source: SubscriptionEventSource.PAYMENT,
        action: SubscriptionEventAction.PURCHASE,
        paymentOrderId: order.id,
        actorUserId: null,
        note: null,
      },
    });
  }

  // ─── Admin actions ──────────────────────────────────────────────────────────

  /** Package → its duration is added (like a purchase); custom date → end set to it. */
  async manualGrant(
    userId: string,
    input: ManualGrantInput,
    actorUserId: string,
    ip: string | null,
    now = new Date(),
  ): Promise<AdminUserSubscriptionDetail> {
    if (Boolean(input.packageId) === Boolean(input.endsAt)) {
      throw this.invalid('GRANT_INPUT_INVALID', 'Choose a package or a custom end date (not both)');
    }
    await this.assertGrantable(userId);
    const note = input.note?.trim() || null;

    if (input.packageId) {
      const pkg = await this.prisma.subscriptionPackage.findFirst({
        where: { id: input.packageId, deletedAt: null },
        select: { id: true, duration: true },
      });
      if (!pkg) throw this.notFound('PACKAGE_NOT_FOUND', 'Package not found');
      const months = PACKAGE_DURATION_MONTHS[pkg.duration];
      await this.prisma.$transaction((tx) =>
        this.extendWithin(tx, {
          userId,
          packageId: pkg.id,
          now,
          computeEnd: (base) => addMonths(base, months),
          event: {
            source: SubscriptionEventSource.MANUAL,
            action: SubscriptionEventAction.GRANT,
            paymentOrderId: null,
            actorUserId,
            note,
          },
        }),
      );
    } else {
      const endsAt = new Date(input.endsAt!);
      if (Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= now.getTime()) {
        throw this.invalid('SUBSCRIPTION_INVALID_DATES', 'End date must be a valid future date');
      }
      await this.prisma.$transaction(async (tx) => {
        const current = await this.lockSubscription(tx, userId);
        const running = current && !current.disabledAt && current.endsAt > now;
        await tx.userSubscription.upsert({
          where: { userId },
          create: { userId, startsAt: now, endsAt },
          update: {
            endsAt,
            disabledAt: null,
            disabledById: null,
            ...RESET_REMINDERS,
            ...(running ? {} : { startsAt: now }),
          },
        });
        await this.logEvent(tx, {
          userId,
          actorUserId,
          source: SubscriptionEventSource.MANUAL,
          action: SubscriptionEventAction.SET_END,
          packageId: null,
          paymentOrderId: null,
          previousEndsAt: current?.endsAt ?? null,
          newEndsAt: endsAt,
          note,
        });
      });
    }
    await this.auditAction(actorUserId, 'SUBSCRIPTION_GRANT', userId, { ...input, note }, ip);
    return this.getUserDetail(userId, now);
  }

  async extendByDays(
    userId: string,
    days: number,
    note: string | undefined,
    actorUserId: string,
    ip: string | null,
    now = new Date(),
  ): Promise<AdminUserSubscriptionDetail> {
    if (!Number.isInteger(days) || days < 1 || days > MAX_EXTEND_DAYS) {
      throw this.invalid('EXTEND_DAYS_INVALID', `Days must be between 1 and ${MAX_EXTEND_DAYS}`);
    }
    await this.assertGrantable(userId);
    await this.prisma.$transaction((tx) =>
      this.extendWithin(tx, {
        userId,
        packageId: undefined,
        now,
        computeEnd: (base) => new Date(base.getTime() + days * 86_400_000),
        event: {
          source: SubscriptionEventSource.MANUAL,
          action: SubscriptionEventAction.EXTEND,
          paymentOrderId: null,
          actorUserId,
          note: note?.trim() || `+${days} days`,
        },
      }),
    );
    await this.auditAction(actorUserId, 'SUBSCRIPTION_EXTEND', userId, { days, note }, ip);
    return this.getUserDetail(userId, now);
  }

  /** Revokes access at once; the end date is kept so it can be re-enabled. */
  async disable(
    userId: string,
    note: string | undefined,
    actorUserId: string,
    ip: string | null,
    now = new Date(),
  ): Promise<AdminUserSubscriptionDetail> {
    await this.prisma.$transaction(async (tx) => {
      const current = await this.lockSubscription(tx, userId);
      if (!current || current.disabledAt) {
        throw this.conflict('SUBSCRIPTION_NOT_ACTIVE', 'This user has no subscription to disable');
      }
      await tx.userSubscription.update({
        where: { userId },
        data: { disabledAt: now, disabledById: actorUserId },
      });
      await this.logEvent(tx, {
        userId,
        actorUserId,
        source: SubscriptionEventSource.MANUAL,
        action: SubscriptionEventAction.DISABLE,
        packageId: null,
        paymentOrderId: null,
        previousEndsAt: current.endsAt,
        newEndsAt: current.endsAt,
        note: note?.trim() || null,
      });
    });
    await this.auditAction(actorUserId, 'SUBSCRIPTION_DISABLE', userId, { note }, ip);
    return this.getUserDetail(userId, now);
  }

  async enable(
    userId: string,
    note: string | undefined,
    actorUserId: string,
    ip: string | null,
    now = new Date(),
  ): Promise<AdminUserSubscriptionDetail> {
    await this.prisma.$transaction(async (tx) => {
      const current = await this.lockSubscription(tx, userId);
      if (!current?.disabledAt) {
        throw this.conflict('SUBSCRIPTION_NOT_DISABLED', 'This subscription is not disabled');
      }
      await tx.userSubscription.update({
        where: { userId },
        data: { disabledAt: null, disabledById: null },
      });
      await this.logEvent(tx, {
        userId,
        actorUserId,
        source: SubscriptionEventSource.MANUAL,
        action: SubscriptionEventAction.ENABLE,
        packageId: null,
        paymentOrderId: null,
        previousEndsAt: current.endsAt,
        newEndsAt: current.endsAt,
        note: note?.trim() || null,
      });
    });
    await this.auditAction(actorUserId, 'SUBSCRIPTION_ENABLE', userId, { note }, ip);
    return this.getUserDetail(userId, now);
  }

  // ─── Learner self-service (DEC-062) ─────────────────────────────────────────
  // No automatic charging exists (SSLCommerz recurring is not enabled): "renewal" is the
  // learner buying again. Cancel = "I will not renew" (access runs to the end date);
  // a downgrade is remembered and offered by the Renew button.

  async cancelAtPeriodEnd(userId: string, role: UserRole, now = new Date()) {
    this.assertLearner(role);
    await this.prisma.$transaction(async (tx) => {
      const current = await this.requireRunning(tx, userId, now);
      if (current.cancelAtPeriodEnd) {
        throw this.conflict('SUBSCRIPTION_ALREADY_CANCELLED', 'Renewal is already cancelled');
      }
      await tx.userSubscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: true, canceledAt: now, scheduledPackageId: null },
      });
      await this.logSelf(
        tx,
        userId,
        SubscriptionEventAction.CANCEL,
        current,
        null,
        'Cancelled renewal',
      );
    });
    return this.getMine(userId, role, now);
  }

  async resume(userId: string, role: UserRole, now = new Date()) {
    this.assertLearner(role);
    await this.prisma.$transaction(async (tx) => {
      const current = await this.requireRunning(tx, userId, now);
      if (!current.cancelAtPeriodEnd) {
        throw this.conflict('SUBSCRIPTION_NOT_CANCELLED', 'Renewal is not cancelled');
      }
      await tx.userSubscription.update({
        where: { userId },
        data: { cancelAtPeriodEnd: false, canceledAt: null },
      });
      await this.logSelf(
        tx,
        userId,
        SubscriptionEventAction.RESUME,
        current,
        null,
        'Resumed renewal',
      );
    });
    return this.getMine(userId, role, now);
  }

  /** Only a DOWNGRADE can be scheduled; upgrades are bought (and applied) right away. */
  async scheduleChange(userId: string, role: UserRole, packageId: string, now = new Date()) {
    this.assertLearner(role);
    const target = await this.packages.findPurchasable(packageId);
    await this.prisma.$transaction(async (tx) => {
      const current = await this.requireRunning(tx, userId, now);
      const kind = classifyPlanChange(current.package, target);
      if (kind !== 'DOWNGRADE') {
        throw this.invalid(
          'PLAN_CHANGE_NOT_DOWNGRADE',
          kind === 'UPGRADE'
            ? 'Upgrades are applied right away — buy the plan instead'
            : 'Choose a different, lower plan',
        );
      }
      await tx.userSubscription.update({
        where: { userId },
        // Picking a plan for next time means the learner does intend to renew.
        data: { scheduledPackageId: target.id, cancelAtPeriodEnd: false, canceledAt: null },
      });
      await this.logSelf(
        tx,
        userId,
        SubscriptionEventAction.SCHEDULE_CHANGE,
        current,
        target.id,
        `Switch to ${target.name} at next renewal`,
      );
    });
    return this.getMine(userId, role, now);
  }

  async clearScheduledChange(userId: string, role: UserRole, now = new Date()) {
    this.assertLearner(role);
    await this.prisma.$transaction(async (tx) => {
      const current = await this.requireRunning(tx, userId, now);
      if (!current.scheduledPackageId) {
        throw this.conflict('NO_SCHEDULED_CHANGE', 'No plan change is scheduled');
      }
      await tx.userSubscription.update({ where: { userId }, data: { scheduledPackageId: null } });
      await this.logSelf(
        tx,
        userId,
        SubscriptionEventAction.CLEAR_SCHEDULED_CHANGE,
        current,
        current.scheduledPackageId,
        'Kept current plan',
      );
    });
    return this.getMine(userId, role, now);
  }

  private assertLearner(role: UserRole) {
    if (role === UserRole.ADMIN) {
      throw this.conflict('SUBSCRIPTION_NOT_NEEDED', 'Admins already have full access');
    }
  }

  /** Locked subscription that is active or starts later (not expired / disabled). */
  private async requireRunning(tx: Tx, userId: string, now: Date) {
    const current = await this.lockSubscription(tx, userId);
    if (!current || current.disabledAt || current.endsAt.getTime() <= now.getTime()) {
      throw this.conflict('SUBSCRIPTION_NOT_ACTIVE', 'You have no active plan');
    }
    return current;
  }

  private async logSelf(
    tx: Tx,
    userId: string,
    action: SubscriptionEventAction,
    current: { endsAt: Date; packageId: string | null },
    packageId: string | null,
    note: string,
  ) {
    // DEC-067 — also visible in Admin → Activity / Audit (written outside the tx; best effort).
    void this.activity
      ?.record({ userId, type: 'SUBSCRIPTION', meta: { action, note } })
      .then(() =>
        this.audit.record({
          actorUserId: userId,
          action: `SUBSCRIPTION_${action}`,
          entityType: 'UserSubscription',
          entityId: userId,
          metadata: { note },
        }),
      );
    return this.logEvent(tx, {
      userId,
      actorUserId: userId,
      source: SubscriptionEventSource.MANUAL,
      action,
      packageId: packageId ?? current.packageId,
      paymentOrderId: null,
      previousEndsAt: current.endsAt,
      newEndsAt: current.endsAt,
      note,
    });
  }

  // ─── Internals ──────────────────────────────────────────────────────────────

  private async extendWithin(
    tx: Tx,
    args: {
      userId: string;
      /** undefined = keep the current package. */
      packageId: string | undefined;
      now: Date;
      clearRenewalChoices?: boolean;
      computeEnd: (base: Date) => Date;
      event: {
        source: SubscriptionEventSource;
        action: SubscriptionEventAction;
        paymentOrderId: string | null;
        actorUserId: string | null;
        note: string | null;
      };
    },
  ): Promise<Date> {
    const { userId, now } = args;
    const current = await this.lockSubscription(tx, userId);
    const running = Boolean(current && !current.disabledAt && current.endsAt > now);
    const base = running ? current!.endsAt : now;
    const endsAt = args.computeEnd(base);
    const pkg = args.packageId === undefined ? {} : { packageId: args.packageId };
    const renewal = args.clearRenewalChoices
      ? { cancelAtPeriodEnd: false, canceledAt: null, scheduledPackageId: null }
      : {};

    await tx.userSubscription.upsert({
      where: { userId },
      create: { userId, startsAt: now, endsAt, ...pkg },
      update: {
        endsAt,
        disabledAt: null,
        disabledById: null,
        ...RESET_REMINDERS,
        ...renewal,
        ...(running ? {} : { startsAt: now }),
        ...pkg,
      },
    });
    await this.logEvent(tx, {
      userId,
      ...args.event,
      packageId: args.packageId ?? current?.packageId ?? null,
      previousEndsAt: current?.endsAt ?? null,
      newEndsAt: endsAt,
    });
    return endsAt;
  }

  /**
   * Locks the user row (always exists, unlike a first subscription) so concurrent payments
   * and admin edits for one user apply strictly one after another.
   */
  private async lockSubscription(tx: Tx, userId: string) {
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId}::uuid FOR UPDATE`;
    return tx.userSubscription.findUnique({
      where: { userId },
      select: {
        startsAt: true,
        endsAt: true,
        disabledAt: true,
        packageId: true,
        cancelAtPeriodEnd: true,
        scheduledPackageId: true,
        package: {
          select: { id: true, duration: true, priceBdt: true, discountedPriceBdt: true },
        },
      },
    });
  }

  private logEvent(
    tx: Tx,
    e: {
      userId: string;
      actorUserId: string | null;
      source: SubscriptionEventSource;
      action: SubscriptionEventAction;
      packageId: string | null;
      paymentOrderId: string | null;
      previousEndsAt: Date | null;
      newEndsAt: Date | null;
      note: string | null;
    },
  ) {
    return tx.subscriptionEvent.create({ data: { ...e, note: e.note?.slice(0, 500) ?? null } });
  }

  private async assertGrantable(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { role: true },
    });
    if (!user) throw this.notFound('USER_NOT_FOUND', 'User not found');
    if (user.role === UserRole.ADMIN) {
      throw this.conflict('SUBSCRIPTION_NOT_NEEDED', 'Admins already have full access');
    }
  }

  private stateSubWhere(
    state: Exclude<SubscriptionState, 'FREE'> | undefined,
    now: Date,
  ): Prisma.UserSubscriptionWhereInput {
    switch (state) {
      case 'ACTIVE':
        return { disabledAt: null, startsAt: { lte: now }, endsAt: { gt: now } };
      case 'SCHEDULED':
        return { disabledAt: null, startsAt: { gt: now }, endsAt: { gt: now } };
      case 'EXPIRED':
        return { disabledAt: null, endsAt: { lte: now } };
      case 'DISABLED':
        return { disabledAt: { not: null } };
      default:
        return {};
    }
  }

  private auditAction(
    actorUserId: string,
    action: string,
    userId: string,
    metadata: Record<string, unknown>,
    ip: string | null,
  ) {
    return this.audit.record({
      actorUserId,
      action,
      entityType: 'UserSubscription',
      entityId: userId,
      metadata: JSON.parse(JSON.stringify({ userId, ...metadata })) as Prisma.InputJsonValue,
      ipAddress: ip,
    });
  }

  toSummary(row: SubscriptionRow | null, now = new Date()): SubscriptionSummary {
    return {
      state: subscriptionState(row, now),
      packageName: row?.package?.name ?? null,
      startsAt: row?.startsAt.toISOString() ?? null,
      endsAt: row?.endsAt.toISOString() ?? null,
      disabledAt: row?.disabledAt?.toISOString() ?? null,
      cancelAtPeriodEnd: row?.cancelAtPeriodEnd ?? false,
      canceledAt: row?.canceledAt?.toISOString() ?? null,
      scheduledPackageName: row?.scheduledPackage?.name ?? null,
    };
  }

  private toSubscriberRow(
    u: {
      id: string;
      name: string;
      whatsappNumber: string;
      email: string | null;
      role: UserRole;
      createdAt: Date;
      subscription: SubscriptionRow | null;
    },
    now: Date,
  ): AdminSubscriberRow {
    return {
      user: {
        id: u.id,
        name: u.name,
        whatsappNumber: u.whatsappNumber,
        email: u.email,
        role: u.role,
        createdAt: u.createdAt.toISOString(),
      },
      subscription: this.toSummary(u.subscription, now),
    };
  }

  toPaymentDto(p: {
    tranId: string;
    packageName: string;
    duration: PackageDuration;
    amount: Prisma.Decimal;
    currency: string;
    status: PaymentOrderDto['status'];
    createdAt: Date;
    validatedAt: Date | null;
  }): PaymentOrderDto {
    return {
      tranId: p.tranId,
      packageName: p.packageName,
      duration: p.duration,
      amount: p.amount.toFixed(2),
      currency: p.currency,
      status: p.status,
      createdAt: p.createdAt.toISOString(),
      validatedAt: p.validatedAt?.toISOString() ?? null,
    };
  }

  private notFound(code: string, message: string) {
    return new NotFoundException(createErrorResponse(code, message, newRequestId()));
  }
  private conflict(code: string, message: string) {
    return new ConflictException(createErrorResponse(code, message, newRequestId()));
  }
  private invalid(code: string, message: string) {
    return new UnprocessableEntityException(createErrorResponse(code, message, newRequestId()));
  }
}
