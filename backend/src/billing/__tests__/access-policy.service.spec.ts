import { ForbiddenException } from '@nestjs/common';
import { ContentAccess, DocumentVisibility, UserRole, UserStatus } from '@prisma/client';
import { CONTENT_LOCKED } from '@your-academy/shared';
import { AccessPolicyService, type ViewerAccess } from '../access-policy.service';
import { SET_DISPLAY_ORDER } from '../set-order';

describe('AccessPolicyService (DEC-060)', () => {
  const now = new Date('2026-11-24T12:00:00.000Z');
  let settings: {
    paidSystemEnabled: boolean;
    preliFreeSetCount: number;
    writtenFreeSetCount: number;
  };
  const prisma = {
    user: { findUnique: jest.fn() },
    userSubscription: { findFirst: jest.fn(), findUnique: jest.fn() },
    questionUploadBatch: { findMany: jest.fn() },
    writtenUploadBatch: { findMany: jest.fn() },
  };
  const service = new AccessPolicyService(
    prisma as never,
    {
      get: async () => ({ ...settings, updatedAt: now }),
    } as never,
  );

  const trialOver = new Date('2026-11-01T00:00:00.000Z');
  const learner = {
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    deletedAt: null,
    trialEndsAt: trialOver,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    settings = { paidSystemEnabled: true, preliFreeSetCount: 10, writtenFreeSetCount: 10 };
    prisma.userSubscription.findFirst.mockResolvedValue(null);
    prisma.questionUploadBatch.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    prisma.writtenUploadBatch.findMany.mockResolvedValue([{ id: 'w1' }]);
  });

  describe('resolve()', () => {
    it('paid system OFF → full access for guests and users, no subscription lookup', async () => {
      settings.paidSystemEnabled = false;
      expect((await service.resolve(null, now)).fullAccess).toBe(true);
      prisma.user.findUnique.mockResolvedValue(learner);
      expect((await service.resolve({ userId: 'u1' }, now)).fullAccess).toBe(true);
    });

    it('paid system ON → guest is locked and flagged as logged out', async () => {
      const a = await service.resolve(null, now);
      expect(a).toMatchObject({ fullAccess: false, userId: null });
    });

    it('admin always has full access', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...learner, role: UserRole.ADMIN });
      expect((await service.resolve({ userId: 'a1' }, now)).fullAccess).toBe(true);
    });

    it('moderator without subscription is treated like a free user', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...learner, role: UserRole.MODERATOR });
      expect((await service.resolve({ userId: 'm1' }, now)).fullAccess).toBe(false);
    });

    it('active subscription (checked at request time) → full access', async () => {
      prisma.user.findUnique.mockResolvedValue(learner);
      prisma.userSubscription.findFirst.mockResolvedValue({ id: 's1' });
      const a = await service.resolve({ userId: 'u1' }, now);
      expect(a).toMatchObject({ fullAccess: true, isPaid: true });
      expect(prisma.userSubscription.findFirst).toHaveBeenCalledWith({
        where: { userId: 'u1', disabledAt: null, startsAt: { lte: now }, endsAt: { gt: now } },
        select: { id: true },
      });
    });

    it('expired / disabled subscription → back to free', async () => {
      prisma.user.findUnique.mockResolvedValue(learner);
      prisma.userSubscription.findFirst.mockResolvedValue(null);
      expect((await service.resolve({ userId: 'u1' }, now)).fullAccess).toBe(false);
    });

    it('suspended or deleted accounts fail closed (treated as guests)', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...learner, status: UserStatus.SUSPENDED });
      expect(await service.resolve({ userId: 'u1' }, now)).toMatchObject({
        fullAccess: false,
        userId: null,
      });
      expect(prisma.userSubscription.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('7-day trial — Topic Base only (DEC-063)', () => {
    const inTrial = { ...learner, trialEndsAt: new Date(now.getTime() + 3 * 86_400_000 - 1000) };

    it('running trial is NOT full access (site-wide locks stay as on the free plan)', async () => {
      prisma.user.findUnique.mockResolvedValue(inTrial);
      const a = await service.resolve({ userId: 'u1' }, now);
      expect(a).toMatchObject({ fullAccess: false, isTrialActive: true, isPaid: false });
    });

    it('free user in trial: Topic Base open; every other section obeys the free plan', async () => {
      prisma.user.findUnique.mockResolvedValue(inTrial);
      const a = await service.resolve({ userId: 'u1' }, now);
      expect(await service.canAccess(a, { kind: 'TOPIC' })).toBe(true);
      // Free-plan items stay open…
      expect(await service.canAccess(a, { kind: 'PRELI_SET', id: 'p1' })).toBe(true);
      expect(await service.canAccess(a, { kind: 'WRITTEN_SET', id: 'w1' })).toBe(true);
      expect(await service.canAccess(a, { kind: 'MODEL_TEST', access: ContentAccess.FREE })).toBe(
        true,
      );
      expect(
        await service.canAccess(a, { kind: 'DOCUMENT', visibility: DocumentVisibility.PUBLIC }),
      ).toBe(true);
      // …and paid items stay locked during the trial.
      expect(await service.canAccess(a, { kind: 'PRELI_SET', id: 'p99' })).toBe(false);
      expect(await service.canAccess(a, { kind: 'WRITTEN_SET', id: 'w99' })).toBe(false);
      expect(await service.canAccess(a, { kind: 'PRELI_QUESTION', uploadBatchId: 'p99' })).toBe(
        false,
      );
      expect(await service.canAccess(a, { kind: 'MODEL_TEST', access: ContentAccess.PAID })).toBe(
        false,
      );
      expect(
        await service.canAccess(a, { kind: 'DOCUMENT', visibility: DocumentVisibility.PREMIUM }),
      ).toBe(false);
      expect(await service.openPreliQuestionsWhere(a)).toBeDefined();
    });

    it('free user after the trial (server time): Topic Base locked, free plan unchanged', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...learner, trialEndsAt: now });
      const a = await service.resolve({ userId: 'u1' }, now);
      expect(a).toMatchObject({ fullAccess: false, isTrialActive: false });
      expect(await service.canAccess(a, { kind: 'TOPIC' })).toBe(false);
      expect(await service.canAccess(a, { kind: 'PRELI_SET', id: 'p1' })).toBe(true);
      expect(await service.canAccess(a, { kind: 'MODEL_TEST', access: ContentAccess.FREE })).toBe(
        true,
      );
      expect(await service.canAccess(a, { kind: 'PRELI_SET', id: 'p99' })).toBe(false);
    });

    it('active paid user (trial over): full access everywhere, Topic Base included', async () => {
      prisma.user.findUnique.mockResolvedValue({ ...learner, trialEndsAt: trialOver });
      prisma.userSubscription.findFirst.mockResolvedValue({ id: 's1' });
      const a = await service.resolve({ userId: 'u1' }, now);
      expect(a.fullAccess).toBe(true);
      expect(await service.canAccess(a, { kind: 'TOPIC' })).toBe(true);
      expect(await service.canAccess(a, { kind: 'PRELI_SET', id: 'p99' })).toBe(true);
      expect(await service.canAccess(a, { kind: 'MODEL_TEST', access: ContentAccess.PAID })).toBe(
        true,
      );
    });

    it('snapshot: topicAccess follows the trial; days left rounded up, 0 after the end', async () => {
      prisma.userSubscription.findUnique.mockResolvedValue(null);
      prisma.user.findUnique.mockResolvedValue({
        ...learner,
        trialEndsAt: new Date(now.getTime() + 2.1 * 86_400_000),
      });
      expect(await service.snapshot('u1', now)).toMatchObject({
        trialDaysLeft: 3,
        fullAccess: false,
        topicAccess: true,
      });
      prisma.user.findUnique.mockResolvedValue({ ...learner, trialEndsAt: trialOver });
      expect(await service.snapshot('u1', now)).toMatchObject({
        trialDaysLeft: 0,
        isTrialActive: false,
        topicAccess: false,
      });
    });
  });

  describe('Topic Base (DEC-061)', () => {
    const base = {
      isAdmin: false,
      isPaid: false,
      isTrialActive: false,
      trialEndsAt: null,
      paidSystemEnabled: true,
      preliFreeSetCount: 10,
      writtenFreeSetCount: 10,
    };

    it('guests are refused even when the paid system is OFF (login required)', async () => {
      const guestOff = { ...base, userId: null, paidSystemEnabled: false, fullAccess: true };
      expect(await service.canAccess(guestOff, { kind: 'TOPIC' })).toBe(false);
      const err = await service.assertAccess(guestOff, { kind: 'TOPIC' }).catch((e: unknown) => e);
      const body = (err as ForbiddenException).getResponse() as {
        error: { details: Array<{ loginRequired: boolean }> };
      };
      expect(body.error.details[0]!.loginRequired).toBe(true);
    });

    it('signed-in user: open with full access or a running trial, locked otherwise', async () => {
      const user = { ...base, userId: 'u1' };
      expect(await service.canAccess({ ...user, fullAccess: true }, { kind: 'TOPIC' })).toBe(true);
      expect(
        await service.canAccess(
          { ...user, fullAccess: false, isTrialActive: true },
          { kind: 'TOPIC' },
        ),
      ).toBe(true);
      expect(await service.canAccess({ ...user, fullAccess: false }, { kind: 'TOPIC' })).toBe(
        false,
      );
    });
  });

  describe('canAccess()', () => {
    const free: ViewerAccess = {
      userId: 'u1',
      fullAccess: false,
      isAdmin: false,
      isPaid: false,
      isTrialActive: false,
      trialEndsAt: null,
      paidSystemEnabled: true,
      preliFreeSetCount: 10,
      writtenFreeSetCount: 10,
    };

    it('first N Preli sets (display order, unfiltered) are free; the rest locked', async () => {
      expect(await service.canAccess(free, { kind: 'PRELI_SET', id: 'p2' })).toBe(true);
      expect(await service.canAccess(free, { kind: 'PRELI_SET', id: 'p99' })).toBe(false);
      expect(prisma.questionUploadBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [...SET_DISPLAY_ORDER], take: 10 }),
      );
    });

    it('N = 0 locks every set without querying', async () => {
      const none = { ...free, preliFreeSetCount: 0, writtenFreeSetCount: 0 };
      expect(await service.canAccess(none, { kind: 'PRELI_SET', id: 'p1' })).toBe(false);
      expect(await service.canAccess(none, { kind: 'WRITTEN_SET', id: 'w1' })).toBe(false);
      expect(prisma.questionUploadBatch.findMany).not.toHaveBeenCalled();
    });

    it('written sets use their own N', async () => {
      await service.canAccess(
        { ...free, writtenFreeSetCount: 3 },
        { kind: 'WRITTEN_SET', id: 'w1' },
      );
      expect(prisma.writtenUploadBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 }),
      );
    });

    it('bank MCQ inherits its set lock; MCQs without a set are free', async () => {
      expect(await service.canAccess(free, { kind: 'PRELI_QUESTION', uploadBatchId: null })).toBe(
        true,
      );
      expect(await service.canAccess(free, { kind: 'PRELI_QUESTION', uploadBatchId: 'p1' })).toBe(
        true,
      );
      expect(await service.canAccess(free, { kind: 'PRELI_QUESTION', uploadBatchId: 'px' })).toBe(
        false,
      );
    });

    it('model tests: FREE open, PAID locked', async () => {
      expect(
        await service.canAccess(free, { kind: 'MODEL_TEST', access: ContentAccess.FREE }),
      ).toBe(true);
      expect(
        await service.canAccess(free, { kind: 'MODEL_TEST', access: ContentAccess.PAID }),
      ).toBe(false);
    });

    it('PREMIUM documents need access; others are open', async () => {
      expect(
        await service.canAccess(free, { kind: 'DOCUMENT', visibility: DocumentVisibility.PREMIUM }),
      ).toBe(false);
      expect(
        await service.canAccess(free, { kind: 'DOCUMENT', visibility: DocumentVisibility.PUBLIC }),
      ).toBe(true);
    });

    it('full access opens everything without any lookups', async () => {
      const full = { ...free, fullAccess: true };
      expect(await service.canAccess(full, { kind: 'PRELI_SET', id: 'p99' })).toBe(true);
      expect(
        await service.canAccess(full, { kind: 'MODEL_TEST', access: ContentAccess.PAID }),
      ).toBe(true);
      expect(prisma.questionUploadBatch.findMany).not.toHaveBeenCalled();
    });

    it('assertAccess throws 403 CONTENT_LOCKED with loginRequired for guests', async () => {
      const guest = { ...free, userId: null };
      const err = await service
        .assertAccess(guest, { kind: 'MODEL_TEST', access: ContentAccess.PAID })
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(ForbiddenException);
      const body = (err as ForbiddenException).getResponse() as {
        error: { code: string; details: Array<{ loginRequired: boolean }> };
      };
      expect(body.error.code).toBe(CONTENT_LOCKED);
      expect(body.error.details[0]!.loginRequired).toBe(true);
    });

    it('openPreliQuestionsWhere limits lists to free sets + set-less MCQs', async () => {
      expect(await service.openPreliQuestionsWhere({ ...free, fullAccess: true })).toBeUndefined();
      expect(await service.openPreliQuestionsWhere(free)).toEqual({
        OR: [{ uploadBatchId: null }, { uploadBatchId: { in: ['p1', 'p2'] } }],
      });
    });
  });
});
