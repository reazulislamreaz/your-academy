import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  type OnApplicationBootstrap,
  type OnModuleDestroy,
} from '@nestjs/common';
import {
  AuditSeverity,
  BrowsingSessionStatus,
  Prisma,
  SubscriptionEventAction,
  UserRole,
} from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { AuditService } from '../audit/audit.service';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { ONLINE_HEARTBEAT_WINDOW_MS } from '../learning-activity/learning-activity.service';

const DAY_MS = 86_400_000;
export const RETENTION_DAYS = 90;
/** The purge record itself is never removed by a later purge. */
export const PURGE_ACTION = 'LOGS_PURGED';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** A UUID prefix (≥ 4 chars of hex / dashes) — matched with LIKE on id::text, parameterized. */
const UUID_PREFIX_RE = /^[0-9a-f][0-9a-f-]{3,35}$/i;

export type PurgeTarget = 'audit' | 'activity' | 'all';
export type PurgeMode = 'retention' | 'before' | 'range';
export type PurgeCriteria = {
  target: PurgeTarget;
  mode: PurgeMode;
  /** mode=before: delete records created before this instant. */
  before?: string;
  /** mode=range: [from, to] inclusive. */
  from?: string;
  to?: string;
};

type Window = { gte?: Date; lt?: Date; lte?: Date };

const activeSubscription = (now: Date): Prisma.UserSubscriptionWhereInput => ({
  disabledAt: null,
  startsAt: { lte: now },
  endsAt: { gt: now },
});

/**
 * DEC-067 — Admin → Activity KPIs and user lookup, and log retention (preview / purge).
 * Purges are Admin-only, need typed confirmation, and always leave a CRITICAL audit entry.
 */
@Injectable()
export class AdminMonitoringService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(AdminMonitoringService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ─── KPIs ───────────────────────────────────────────────────────────────────

  async kpis(now = new Date()) {
    const ago = (ms: number) => new Date(now.getTime() - ms);
    const learner: Prisma.UserWhereInput = { role: UserRole.USER, deletedAt: null };
    const day = ago(DAY_MS);
    const [
      reg1,
      reg7,
      reg30,
      totalUsers,
      paidActive,
      online,
      online5m,
      dauHeartbeat,
      dauEvents,
      firstPurchases,
    ] = await Promise.all([
      this.prisma.user.count({ where: { ...learner, createdAt: { gte: day } } }),
      this.prisma.user.count({ where: { ...learner, createdAt: { gte: ago(7 * DAY_MS) } } }),
      this.prisma.user.count({ where: { ...learner, createdAt: { gte: ago(30 * DAY_MS) } } }),
      this.prisma.user.count({ where: learner }),
      this.prisma.user.count({
        where: { ...learner, subscription: { is: activeSubscription(now) } },
      }),
      this.distinctHeartbeatUsers(ago(ONLINE_HEARTBEAT_WINDOW_MS), true),
      this.distinctHeartbeatUsers(ago(5 * 60_000), false),
      this.prisma.browsingSession.groupBy({
        by: ['userId'],
        where: { lastHeartbeatAt: { gte: day } },
      }),
      this.prisma.learningActivityEvent.groupBy({
        by: ['userId'],
        where: { occurredAt: { gte: day } },
      }),
      // First-ever paid purchase per user → "new paid conversions".
      this.prisma.subscriptionEvent.groupBy({
        by: ['userId'],
        where: { action: SubscriptionEventAction.PURCHASE },
        _min: { createdAt: true },
      }),
    ]);
    const dau = new Set([...dauHeartbeat, ...dauEvents].map((r) => r.userId)).size;
    const firsts = firstPurchases.map((r) => r._min.createdAt?.getTime() ?? 0);
    return {
      registrations: { today: reg1, d7: reg7, d30: reg30 },
      totalUsers,
      online: { now: online, m5: online5m, windowMs: ONLINE_HEARTBEAT_WINDOW_MS },
      dau,
      paid: {
        active: paidActive,
        free: Math.max(0, totalUsers - paidActive),
        percent: totalUsers ? Math.round((paidActive / totalUsers) * 1000) / 10 : 0,
        newConversions: {
          d7: firsts.filter((t) => t >= ago(7 * DAY_MS).getTime()).length,
          d30: firsts.filter((t) => t >= ago(30 * DAY_MS).getTime()).length,
        },
      },
      generatedAt: now.toISOString(),
    };
  }

  private async distinctHeartbeatUsers(since: Date, activeOnly: boolean): Promise<number> {
    const rows = await this.prisma.browsingSession.groupBy({
      by: ['userId'],
      where: {
        lastHeartbeatAt: { gte: since },
        ...(activeOnly ? { status: BrowsingSessionStatus.ACTIVE } : {}),
        user: { deletedAt: null },
      },
    });
    return rows.length;
  }

  // ─── Name ↔ User ID lookup ──────────────────────────────────────────────────

  /**
   * Full UUID → exact match. UUID prefix → `id::text LIKE 'prefix%'` (parameterized). Anything
   * else → name / email / WhatsApp contains. Never throws on malformed input.
   */
  async lookupUsers(rawQ: string | undefined, now = new Date()) {
    const q = (rawQ ?? '').trim().slice(0, 120);
    if (q.length < 2) return { query: q, matchedBy: 'none' as const, items: [] };

    let matchedBy: 'id' | 'id-prefix' | 'text';
    let ids: string[] | null = null;
    if (UUID_RE.test(q)) {
      matchedBy = 'id';
      ids = [q.toLowerCase()];
    } else if (UUID_PREFIX_RE.test(q) && /\d/.test(q)) {
      matchedBy = 'id-prefix';
      const rows = await this.prisma.$queryRaw<Array<{ id: string }>>`
        SELECT id::text AS id FROM users
        WHERE deleted_at IS NULL AND id::text LIKE ${`${q.toLowerCase().replace(/[%_]/g, '')}%`}
        LIMIT 10`;
      ids = rows.map((r) => r.id);
    } else {
      matchedBy = 'text';
    }

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(ids
          ? { id: { in: ids } }
          : {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { whatsappNumber: { contains: q.replace(/\s+/g, '') } },
              ],
            }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        whatsappNumber: true,
        role: true,
        status: true,
        createdAt: true,
        subscription: { select: { startsAt: true, endsAt: true, disabledAt: true } },
        browsingSessions: {
          orderBy: { lastHeartbeatAt: 'desc' },
          take: 1,
          select: { lastHeartbeatAt: true },
        },
      },
    });

    return {
      query: q,
      matchedBy,
      items: users.map((u) => {
        const s = u.subscription;
        const paid = Boolean(
          s && !s.disabledAt && s.startsAt <= now && s.endsAt.getTime() > now.getTime(),
        );
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          whatsappNumber: u.whatsappNumber,
          role: u.role,
          status: u.status,
          createdAt: u.createdAt.toISOString(),
          plan: u.role === UserRole.USER ? (paid ? 'PAID' : 'FREE') : 'STAFF',
          subscriptionEndsAt: s && !s.disabledAt ? s.endsAt.toISOString() : null,
          lastActiveAt: u.browsingSessions[0]?.lastHeartbeatAt.toISOString() ?? null,
        };
      }),
    };
  }

  // ─── Log retention ──────────────────────────────────────────────────────────

  private window(c: PurgeCriteria, now: Date): Window {
    const bad = (msg: string) =>
      new BadRequestException(createErrorResponse('PURGE_CRITERIA_INVALID', msg, newRequestId()));
    const parse = (v: string | undefined, label: string) => {
      const d = v ? new Date(v) : null;
      if (!d || Number.isNaN(d.getTime())) throw bad(`${label} must be a valid date`);
      return d;
    };
    if (!['audit', 'activity', 'all'].includes(c.target)) throw bad('Unknown log type');
    if (c.mode === 'retention') return { lt: new Date(now.getTime() - RETENTION_DAYS * DAY_MS) };
    if (c.mode === 'before') {
      const before = parse(c.before, 'Cutoff date');
      if (before.getTime() > now.getTime()) throw bad('Cutoff date cannot be in the future');
      return { lt: before };
    }
    if (c.mode === 'range') {
      const from = parse(c.from, 'Start date');
      const to = parse(c.to, 'End date');
      if (from.getTime() > to.getTime()) throw bad('Start date must be before the end date');
      return { gte: from, lte: to };
    }
    throw bad('Unknown purge mode');
  }

  private auditWhere(w: Window): Prisma.AuditLogWhereInput {
    return { createdAt: w, action: { not: PURGE_ACTION } };
  }

  private activityWhere(w: Window): Prisma.LearningActivityEventWhereInput {
    return { occurredAt: w };
  }

  async previewPurge(c: PurgeCriteria, now = new Date()) {
    const w = this.window(c, now);
    const [audit, activity] = await Promise.all([
      c.target === 'activity' ? 0 : this.prisma.auditLog.count({ where: this.auditWhere(w) }),
      c.target === 'audit'
        ? 0
        : this.prisma.learningActivityEvent.count({ where: this.activityWhere(w) }),
    ]);
    return { criteria: this.describe(c, w), counts: { audit, activity, total: audit + activity } };
  }

  async purge(
    c: PurgeCriteria & { confirm: string },
    actor: { userId: string; role: UserRole } | null,
    meta: { ipAddress?: string | null; userAgent?: string | null } = {},
    now = new Date(),
  ) {
    // Defence in depth: the route already requires the Admin-only `audit` permission.
    if (actor && actor.role !== UserRole.ADMIN) {
      throw new ForbiddenException(
        createErrorResponse('FORBIDDEN', 'Only admins can delete logs', newRequestId()),
      );
    }
    if (c.confirm !== 'DELETE') {
      throw new BadRequestException(
        createErrorResponse('PURGE_NOT_CONFIRMED', 'Type DELETE to confirm', newRequestId()),
      );
    }
    const w = this.window(c, now);
    const [audit, activity] = await this.prisma.$transaction(async (tx) => {
      const a =
        c.target === 'activity'
          ? { count: 0 }
          : await tx.auditLog.deleteMany({ where: this.auditWhere(w) });
      const e =
        c.target === 'audit'
          ? { count: 0 }
          : await tx.learningActivityEvent.deleteMany({ where: this.activityWhere(w) });
      return [a.count, e.count];
    });
    const criteria = this.describe(c, w);
    await this.audit.record({
      actorUserId: actor?.userId ?? null,
      actorRole: actor ? actor.role : 'SYSTEM',
      action: PURGE_ACTION,
      entityType: 'Logs',
      severity: AuditSeverity.CRITICAL,
      metadata: { criteria, deleted: { audit, activity } },
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
    });
    this.logger.warn(
      `Logs purged by ${actor?.userId ?? 'retention job'}: audit=${audit} activity=${activity} (${criteria.summary})`,
    );
    return { criteria, deleted: { audit, activity, total: audit + activity } };
  }

  private describe(c: PurgeCriteria, w: Window) {
    const iso = (d?: Date) => d?.toISOString() ?? null;
    const summary =
      c.mode === 'retention'
        ? `older than ${RETENTION_DAYS} days (before ${iso(w.lt)})`
        : c.mode === 'before'
          ? `before ${iso(w.lt)}`
          : `from ${iso(w.gte)} to ${iso(w.lte)}`;
    return {
      target: c.target,
      mode: c.mode,
      before: iso(w.lt),
      from: iso(w.gte),
      to: iso(w.lte),
      summary,
    };
  }

  // ─── Optional automatic retention (LOG_RETENTION_AUTO_PURGE=true) ───────────

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.LOG_RETENTION_AUTO_PURGE !== 'true') return;
    const run = () =>
      void this.purge({ target: 'all', mode: 'retention', confirm: 'DELETE' }, null).catch((err) =>
        this.logger.error(`Automatic log retention failed: ${String(err)}`),
      );
    this.timer = setInterval(run, DAY_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
