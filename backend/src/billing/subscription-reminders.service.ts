import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { EmailQueueService } from '../queue/email-queue.service';
import { effectivePrice } from './packages.service';
import { SiteSettingsService } from './site-settings.service';
import { getWebBaseUrl } from './sslcommerz/sslcommerz.config';

const DAY_MS = 86_400_000;
const BATCH = 200;

const num = (raw: string | undefined, fallback: number, min: number) => {
  const n = Number(raw);
  return Number.isFinite(n) && n >= min ? n : fallback;
};

export type ReminderRunResult = { sent7: number; sent3: number; failed: number };

const ROW_SELECT = {
  id: true,
  userId: true,
  endsAt: true,
  cancelAtPeriodEnd: true,
  reminder7DaysSentAt: true,
  reminder3DaysSentAt: true,
  package: {
    select: {
      name: true,
      isActive: true,
      deletedAt: true,
      priceBdt: true,
      discountedPriceBdt: true,
    },
  },
  scheduledPackage: {
    select: {
      name: true,
      isActive: true,
      deletedAt: true,
      priceBdt: true,
      discountedPriceBdt: true,
    },
  },
  user: { select: { email: true, name: true } },
} as const;

type Row = Prisma.UserSubscriptionGetPayload<{ select: typeof ROW_SELECT }>;

/**
 * DEC-062 — emails learners 7 and 3 days before their plan ends. Runs in the API on a timer
 * (hourly by default, so a missed day or a restart never skips a window). Each reminder is
 * claimed with a conditional UPDATE on its `reminder*SentAt` flag (and the same end date), so
 * several API replicas or re-runs never send it twice; the flags are cleared whenever the
 * end date changes (renewal / admin extension) — see SubscriptionsService.
 */
@Injectable()
export class SubscriptionRemindersService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(SubscriptionRemindersService.name);
  private timer: NodeJS.Timeout | null = null;
  private firstRun: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SiteSettingsService,
    private readonly emailQueue: EmailQueueService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.SUBSCRIPTION_REMINDERS_ENABLED === 'false') {
      return;
    }
    const everyMs = num(process.env.SUBSCRIPTION_REMINDER_INTERVAL_MINUTES, 60, 5) * 60_000;
    this.firstRun = setTimeout(() => void this.runSafely(), 2 * 60_000);
    this.firstRun.unref();
    this.timer = setInterval(() => void this.runSafely(), everyMs);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.firstRun) clearTimeout(this.firstRun);
  }

  private async runSafely() {
    try {
      const r = await this.runOnce();
      if (r.sent7 || r.sent3 || r.failed) {
        this.logger.log(`Reminders: ${r.sent7} × 7-day, ${r.sent3} × 3-day, ${r.failed} failed`);
      }
    } catch (err) {
      this.logger.error(`Subscription reminder run failed: ${String(err)}`);
    }
  }

  /** One pass; safe to call any time (admin "Run now" uses it too). */
  async runOnce(now = new Date()): Promise<ReminderRunResult> {
    const result: ReminderRunResult = { sent7: 0, sent3: 0, failed: 0 };
    if (this.running) return result;
    this.running = true;
    try {
      // Paid system off = everything is free; nobody needs to renew.
      if (!(await this.settings.get()).paidSystemEnabled) return result;
      const in3 = new Date(now.getTime() + 3 * DAY_MS);
      const in7 = new Date(now.getTime() + 7 * DAY_MS);
      let cursor: string | undefined;
      for (;;) {
        const rows: Row[] = await this.prisma.userSubscription.findMany({
          where: {
            disabledAt: null,
            startsAt: { lte: now },
            endsAt: { gt: now, lte: in7 },
            OR: [
              { reminder3DaysSentAt: null, endsAt: { lte: in3 } },
              { reminder7DaysSentAt: null, endsAt: { gt: in3 } },
            ],
            // Only confirmed addresses — billing details never go to an unverified inbox.
            user: {
              deletedAt: null,
              role: { not: UserRole.ADMIN },
              email: { not: null },
              emailVerifiedAt: { not: null },
            },
          },
          orderBy: { id: 'asc' },
          take: BATCH,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: ROW_SELECT,
        });
        for (const row of rows) {
          const window = row.endsAt.getTime() <= in3.getTime() ? 3 : 7;
          const outcome = await this.sendOne(row, window, now);
          if (outcome === 'sent') result[window === 3 ? 'sent3' : 'sent7']++;
          if (outcome === 'failed') result.failed++;
        }
        if (rows.length < BATCH) break;
        cursor = rows[rows.length - 1].id;
      }
      return result;
    } finally {
      this.running = false;
    }
  }

  private async sendOne(
    row: Row,
    window: 7 | 3,
    now: Date,
  ): Promise<'sent' | 'skipped' | 'failed'> {
    const flag = window === 3 ? 'reminder3DaysSentAt' : 'reminder7DaysSentAt';
    // A 3-day reminder also covers the 7-day one (plan bought with < 3 days left, or a gap).
    const claim = await this.prisma.userSubscription.updateMany({
      where: { id: row.id, endsAt: row.endsAt, [flag]: null },
      data:
        window === 3
          ? { reminder3DaysSentAt: now, reminder7DaysSentAt: row.reminder7DaysSentAt ?? now }
          : { reminder7DaysSentAt: now },
    });
    if (claim.count !== 1) return 'skipped';

    const renewalPkg = [row.scheduledPackage, row.package].find(
      (p) => p && p.isActive && !p.deletedAt,
    );
    try {
      await this.emailQueue.enqueueSubscriptionReminder(
        {
          to: row.user.email!,
          userId: row.userId,
          name: row.user.name,
          window,
          daysLeft: Math.max(1, Math.ceil((row.endsAt.getTime() - now.getTime()) / DAY_MS)),
          endsAt: row.endsAt.toISOString(),
          planName: row.package?.name ?? null,
          renewal: renewalPkg
            ? { planName: renewalPkg.name, amountBdt: effectivePrice(renewalPkg).toFixed(2) }
            : null,
          cancelled: row.cancelAtPeriodEnd,
          manageUrl: `${getWebBaseUrl()}/billing`,
        },
        `${row.id}-${window}d-${row.endsAt.getTime()}`,
      );
      return 'sent';
    } catch (err) {
      // Release the claim so the next run retries.
      await this.prisma.userSubscription
        .updateMany({
          where: { id: row.id, [flag]: now },
          data:
            window === 3
              ? {
                  reminder3DaysSentAt: null,
                  reminder7DaysSentAt: row.reminder7DaysSentAt,
                }
              : { reminder7DaysSentAt: null },
        })
        .catch(() => undefined);
      this.logger.error(`Could not queue ${window}-day reminder for ${row.userId}: ${String(err)}`);
      return 'failed';
    }
  }
}
