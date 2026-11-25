import { ForbiddenException, Injectable } from '@nestjs/common';
import { ContentAccess, DocumentVisibility, Prisma, UserRole, UserStatus } from '@prisma/client';
import {
  CONTENT_LOCKED,
  createErrorResponse,
  type ContentLockedDetail,
  type UserAccessSnapshot,
} from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { LISTED_PRELI_SET_WHERE, LISTED_WRITTEN_SET_WHERE, SET_DISPLAY_ORDER } from './set-order';
import { SiteSettingsService } from './site-settings.service';

/** Anything carrying the optional signed-in user id (RequestUser, null for guests). */
export type AccessViewer = { userId: string } | null | undefined;

/**
 * DEC-060 — what one viewer may open on this request. Resolved once per request and passed
 * to `canAccess` / list decorators, so the switch → content → subscription order lives here.
 */
export type ViewerAccess = {
  userId: string | null;
  /** Admin, paid system OFF or active subscriber — nothing is locked. Never the trial. */
  fullAccess: boolean;
  isAdmin: boolean;
  isPaid: boolean;
  /** DEC-061 / DEC-063 — `now < users.trial_ends_at`. Unlocks Topic Base ONLY. */
  isTrialActive: boolean;
  trialEndsAt: Date | null;
  paidSystemEnabled: boolean;
  preliFreeSetCount: number;
  writtenFreeSetCount: number;
};

export type LockableContent =
  | { kind: 'PRELI_SET'; id: string }
  | { kind: 'WRITTEN_SET'; id: string }
  /** A bank MCQ inherits its Preli set's lock; no set → free. */
  | { kind: 'PRELI_QUESTION'; uploadBatchId: string | null }
  | { kind: 'MODEL_TEST'; access: ContentAccess }
  | { kind: 'DOCUMENT'; visibility: DocumentVisibility }
  /** DEC-061 / DEC-063 — Topic Base: login always, then trial / subscription (when paid ON). */
  | { kind: 'TOPIC' };

/**
 * DEC-060 / DEC-061 / DEC-063 — the one place that decides Free vs Paid access:
 *   0. Topic Base content always needs a signed-in account.
 *   1. Admin → everything.  2. Paid system OFF → everything.  3. Active subscription → everything.
 *   4. Content is free (free-N sets, FREE Model Tests, non-PREMIUM PDFs) → open.
 *   5. Topic Base only: the 7-day trial → open (DEC-063 — it unlocks nothing else).
 *   Otherwise locked.
 * Locked content must not be sent at all — callers check before loading it.
 */
@Injectable()
export class AccessPolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SiteSettingsService,
  ) {}

  async resolve(viewer: AccessViewer, now = new Date()): Promise<ViewerAccess> {
    const settings = await this.settings.get();
    const base = {
      paidSystemEnabled: settings.paidSystemEnabled,
      preliFreeSetCount: settings.preliFreeSetCount,
      writtenFreeSetCount: settings.writtenFreeSetCount,
    };
    const userId = viewer?.userId ?? null;
    if (!userId) {
      return {
        ...base,
        userId: null,
        isAdmin: false,
        isPaid: false,
        isTrialActive: false,
        trialEndsAt: null,
        fullAccess: !base.paidSystemEnabled,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, status: true, deletedAt: true, trialEndsAt: true },
    });
    // Unknown / suspended / deleted accounts are treated like guests (fail closed).
    if (!user || user.deletedAt || user.status !== UserStatus.ACTIVE) {
      return {
        ...base,
        userId: null,
        isAdmin: false,
        isPaid: false,
        isTrialActive: false,
        trialEndsAt: null,
        fullAccess: !base.paidSystemEnabled,
      };
    }
    const isAdmin = user.role === UserRole.ADMIN;
    const isPaid = await this.isUserPaid(userId, now);
    // Server clock only — the browser never decides whether the trial is running.
    const isTrialActive = user.trialEndsAt.getTime() > now.getTime();
    return {
      ...base,
      userId,
      isAdmin,
      isPaid,
      isTrialActive,
      trialEndsAt: user.trialEndsAt,
      // DEC-063: the trial is NOT full access — it only unlocks Topic Base (canAccess).
      fullAccess: isAdmin || isPaid || !base.paidSystemEnabled,
    };
  }

  /** For `/auth/me` — lets the UI show plan state and locks. */
  async snapshot(userId: string, now = new Date()): Promise<UserAccessSnapshot> {
    const [access, sub] = await Promise.all([
      this.resolve({ userId }, now),
      this.prisma.userSubscription.findUnique({
        where: { userId },
        select: { endsAt: true, disabledAt: true },
      }),
    ]);
    return {
      paidSystemEnabled: access.paidSystemEnabled,
      fullAccess: access.fullAccess,
      isPaid: access.isPaid,
      subscriptionEndsAt: sub && !sub.disabledAt ? sub.endsAt.toISOString() : null,
      isTrialActive: access.isTrialActive,
      topicAccess: access.userId !== null && (access.fullAccess || access.isTrialActive),
      trialEndsAt: access.trialEndsAt?.toISOString() ?? null,
      trialDaysLeft: trialDaysLeft(access.trialEndsAt, now),
    };
  }

  /** Paid = not disabled and `startsAt <= now < endsAt`. Expiry needs no job — checked here. */
  async isUserPaid(userId: string, now = new Date()): Promise<boolean> {
    const sub = await this.prisma.userSubscription.findFirst({
      where: { userId, disabledAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
      select: { id: true },
    });
    return Boolean(sub);
  }

  async canAccess(access: ViewerAccess, content: LockableContent): Promise<boolean> {
    // Before the full-access shortcut: guests get full access while the paid system is OFF,
    // but Topic Base still requires an account.
    if (content.kind === 'TOPIC' && access.userId === null) return false;
    if (access.fullAccess) return true;
    switch (content.kind) {
      case 'MODEL_TEST':
        return content.access === ContentAccess.FREE;
      case 'DOCUMENT':
        return content.visibility !== DocumentVisibility.PREMIUM;
      case 'PRELI_SET':
        return (await this.freePreliSetIds(access)).has(content.id);
      case 'WRITTEN_SET':
        return (await this.freeWrittenSetIds(access)).has(content.id);
      case 'PRELI_QUESTION':
        return (
          content.uploadBatchId === null ||
          (await this.freePreliSetIds(access)).has(content.uploadBatchId)
        );
      case 'TOPIC':
        // DEC-063 — the 7-day trial applies to Topic Base and nowhere else.
        return access.isTrialActive;
    }
  }

  async assertAccess(access: ViewerAccess, content: LockableContent): Promise<void> {
    if (!(await this.canAccess(access, content))) throw this.lockedError(access);
  }

  lockedError(access: Pick<ViewerAccess, 'userId'>): ForbiddenException {
    const detail: ContentLockedDetail = {
      reason: 'PAID_REQUIRED',
      loginRequired: access.userId === null,
    };
    return new ForbiddenException(
      createErrorResponse(
        CONTENT_LOCKED,
        access.userId === null
          ? 'Log in or sign up to view this content'
          : 'Become a paid user to unlock this content',
        newRequestId(),
        [detail],
      ),
    );
  }

  /**
   * The first N Preli sets in display order (global, ignoring list filters, so a year or
   * category filter never changes which sets are free). Empty when N = 0.
   */
  async freePreliSetIds(access: Pick<ViewerAccess, 'preliFreeSetCount'>): Promise<Set<string>> {
    if (access.preliFreeSetCount <= 0) return new Set();
    const rows = await this.prisma.questionUploadBatch.findMany({
      where: LISTED_PRELI_SET_WHERE,
      orderBy: [...SET_DISPLAY_ORDER],
      take: access.preliFreeSetCount,
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  async freeWrittenSetIds(access: Pick<ViewerAccess, 'writtenFreeSetCount'>): Promise<Set<string>> {
    if (access.writtenFreeSetCount <= 0) return new Set();
    const rows = await this.prisma.writtenUploadBatch.findMany({
      where: LISTED_WRITTEN_SET_WHERE,
      orderBy: [...SET_DISPLAY_ORDER],
      take: access.writtenFreeSetCount,
      select: { id: true },
    });
    return new Set(rows.map((r) => r.id));
  }

  /**
   * Extra `where` for bank-MCQ lists so locked questions are never loaded:
   * `undefined` = nothing locked for this viewer.
   */
  async openPreliQuestionsWhere(
    access: ViewerAccess,
  ): Promise<Prisma.QuestionWhereInput | undefined> {
    if (access.fullAccess) return undefined;
    const free = [...(await this.freePreliSetIds(access))];
    return { OR: [{ uploadBatchId: null }, { uploadBatchId: { in: free } }] };
  }
}

/** Whole days left, rounded up ("2.1 days" → 3); 0 once the trial has ended. */
export function trialDaysLeft(trialEndsAt: Date | null, now = new Date()): number {
  if (!trialEndsAt) return 0;
  const ms = trialEndsAt.getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : 0;
}
