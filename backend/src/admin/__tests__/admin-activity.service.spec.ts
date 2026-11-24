import { BrowsingSessionStatus, UserRole, UserStatus } from '@prisma/client';
import { AdminService } from '../admin.service';
import { ONLINE_HEARTBEAT_WINDOW_MS } from '../../learning-activity/learning-activity.service';

describe('AdminService activity / users', () => {
  const now = new Date('2026-11-11T12:00:00.000Z');

  function build(prisma: Record<string, unknown>) {
    const learningActivity = {
      onlineSince: (at: Date = new Date()) =>
        new Date(at.getTime() - ONLINE_HEARTBEAT_WINDOW_MS),
      record: jest.fn(),
    };
    const subscriptions = {
      toSummary: (row: unknown) => ({ state: row ? 'ACTIVE' : 'FREE' }),
    };
    return new AdminService(prisma as never, learningActivity as never, subscriptions as never);
  }

  it('classifies online users using the 90s heartbeat window', async () => {
    jest.useFakeTimers().setSystemTime(now);
    const fresh = new Date(now.getTime() - 30_000);
    const stale = new Date(now.getTime() - 120_000);

    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'u-online',
            name: 'Online',
            whatsappNumber: '+8801711111111',
            email: null,
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            createdAt: now,
            avatarAssetId: null,
            avatarAsset: null,
            browsingSessions: [{ lastHeartbeatAt: fresh, accruedSeconds: 40 }],
            _count: { questionAttempts: 2, practiceAttempts: 0 },
            subscription: null,
          },
          {
            id: 'u-offline',
            name: 'Offline',
            whatsappNumber: '+8801722222222',
            email: null,
            role: UserRole.USER,
            status: UserStatus.ACTIVE,
            createdAt: now,
            avatarAssetId: null,
            avatarAsset: null,
            browsingSessions: [{ lastHeartbeatAt: stale, accruedSeconds: 10 }],
            _count: { questionAttempts: 0, practiceAttempts: 0 },
            subscription: null,
          },
        ]),
      },
    };

    const service = build(prisma);
    const result = await service.listUsers({});
    expect(result.items[0]?.online).toBe(true);
    expect(result.items[1]?.online).toBe(false);
    jest.useRealTimers();
  });

  it('activityOnline filters ACTIVE sessions within heartbeat window', async () => {
    jest.useFakeTimers().setSystemTime(now);
    const prisma = {
      browsingSession: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 's1',
            startedAt: now,
            lastHeartbeatAt: now,
            accruedSeconds: 60,
            user: {
              id: 'u1',
              name: 'A',
              whatsappNumber: '+8801711111111',
              email: null,
              role: UserRole.USER,
              status: UserStatus.ACTIVE,
            },
          },
        ]),
      },
    };
    const service = build(prisma);
    const result = await service.activityOnline({});
    expect(prisma.browsingSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: BrowsingSessionStatus.ACTIVE,
          lastHeartbeatAt: { gte: new Date(now.getTime() - ONLINE_HEARTBEAT_WINDOW_MS) },
        }),
      }),
    );
    expect(result.items).toHaveLength(1);
    expect(result.onlineHeartbeatWindowMs).toBe(90_000);
    jest.useRealTimers();
  });

  it('getUser aggregates attempt and session fixtures', async () => {
    jest.useFakeTimers().setSystemTime(now);
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'u1',
          name: 'Learner',
          whatsappNumber: '+8801711111111',
          email: null,
          role: UserRole.USER,
          status: UserStatus.ACTIVE,
          createdAt: now,
          onboardingCompletedAt: null,
          preferredCategoryIds: [],
          avatarAssetId: null,
          avatarAsset: null,
          subscription: null,
        }),
      },
      questionAttempt: {
        count: jest
          .fn()
          .mockResolvedValueOnce(10)
          .mockResolvedValueOnce(7)
          .mockResolvedValueOnce(3),
        groupBy: jest.fn().mockResolvedValue([
          { categoryId: 'cat1', _count: { id: 5 } },
          { categoryId: 'cat2', _count: { id: 2 } },
        ]),
      },
      browsingSession: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: { accruedSeconds: 900 },
          _count: { _all: 3 },
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 's1',
            startedAt: new Date(now.getTime() - 600_000),
            endedAt: now,
            lastHeartbeatAt: now,
            accruedSeconds: 300,
            status: BrowsingSessionStatus.ENDED,
          },
        ]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      learningActivityEvent: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      practiceAttempt: {
        aggregate: jest.fn().mockResolvedValue({
          _count: { _all: 2 },
          _sum: {
            correctCount: 8,
            wrongCount: 2,
            skippedCount: 0,
            score: 16,
            elapsedSeconds: 120,
          },
          _avg: { percentScore: 80 },
          _max: { percentScore: 90 },
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'pa1',
            status: 'SUBMITTED',
            submittedAt: now,
            elapsedSeconds: 60,
            score: 8,
            maxScore: 10,
            percentScore: 80,
            passed: true,
            correctCount: 8,
            wrongCount: 2,
            skippedCount: 0,
            practiceSet: {
              id: 'ps1',
              title: 'Set A',
              kind: 'MODEL_TEST',
              examTag: null,
              category: { id: 'cat1', name: 'Bangla' },
            },
          },
        ]),
      },
      category: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'cat1', name: 'Bangla', parentId: null },
          { id: 'cat2', name: 'Math', parentId: null },
        ]),
      },
    };

    const service = build(prisma);
    const detail = await service.getUser('u1');
    expect(detail.study.attempts).toBe(10);
    expect(detail.study.correct).toBe(7);
    expect(detail.study.incorrect).toBe(3);
    expect(detail.study.activeSeconds).toBe(900);
    expect(detail.study.practiceCompletes).toBe(2);
    // Only topics with ≥3 attempts
    expect(detail.observedEngagement).toEqual([
      expect.objectContaining({ categoryId: 'cat1', attempts: 5 }),
    ]);
    expect(detail.sessions[0]?.wallSeconds).toBe(600);
    jest.useRealTimers();
  });
});
