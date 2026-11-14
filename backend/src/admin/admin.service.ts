import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  BrowsingSessionStatus,
  LearningActivityType,
  PracticeAttemptStatus,
  Prisma,
  QuestionStatus,
  SubscriptionStatus,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import {
  LearningActivityService,
  ONLINE_HEARTBEAT_WINDOW_MS,
} from '../learning-activity/learning-activity.service';

const ACTIVITY_TYPES = new Set<string>(Object.values(LearningActivityType));

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learningActivity: LearningActivityService,
  ) {}

  async dashboard() {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const onlineSince = this.learningActivity.onlineSince(now);

    const [
      totalUsers,
      activeUsers,
      trialActiveUsers,
      totalQuestions,
      publishedQuestions,
      draftQuestions,
      archivedQuestions,
      totalCategories,
      totalNews,
      totalDocuments,
      browsingAgg,
      recentUsers,
      recentActivity,
      onlineCount,
      newRegistrations24h,
      attemptsToday,
      practiceCompletesToday,
      activeSecondsToday,
      topSubjectsRaw,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE, deletedAt: null } }),
      this.prisma.user.count({
        where: {
          deletedAt: null,
          status: UserStatus.ACTIVE,
          trialStartedAt: { lte: now },
          trialEndsAt: { gt: now },
        },
      }),
      this.prisma.question.count({ where: { deletedAt: null } }),
      this.prisma.question.count({
        where: { deletedAt: null, status: QuestionStatus.PUBLISHED },
      }),
      this.prisma.question.count({
        where: { deletedAt: null, status: QuestionStatus.DRAFT },
      }),
      this.prisma.question.count({
        where: { deletedAt: null, status: QuestionStatus.ARCHIVED },
      }),
      this.prisma.category.count({ where: { isActive: true } }),
      this.prisma.news.count({ where: { deletedAt: null } }),
      this.prisma.document.count({ where: { deletedAt: null } }),
      this.prisma.browsingSession.aggregate({ _sum: { accruedSeconds: true } }),
      this.prisma.user.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          whatsappNumber: true,
          createdAt: true,
          role: true,
          status: true,
        },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 12,
        include: {
          actor: { select: { id: true, name: true, role: true } },
        },
      }),
      this.prisma.browsingSession.count({
        where: {
          status: BrowsingSessionStatus.ACTIVE,
          lastHeartbeatAt: { gte: onlineSince },
        },
      }),
      this.prisma.user.count({
        where: { deletedAt: null, createdAt: { gte: dayAgo } },
      }),
      this.prisma.questionAttempt.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.practiceAttempt.count({
        where: {
          submittedAt: { gte: dayAgo },
          status: { in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED] },
        },
      }),
      this.prisma.browsingSession.aggregate({
        where: { lastHeartbeatAt: { gte: dayAgo } },
        _sum: { accruedSeconds: true },
      }),
      this.prisma.questionAttempt.groupBy({
        by: ['categoryId'],
        where: { createdAt: { gte: weekAgo } },
        _count: { id: true },
        orderBy: { _count: { categoryId: 'desc' } },
        take: 5,
      }),
    ]);

    const trialExpiredUsers = await this.prisma.user.count({
      where: {
        deletedAt: null,
        status: UserStatus.ACTIVE,
        trialEndsAt: { lte: now },
        role: UserRole.USER,
      },
    });

    const subjectIds = topSubjectsRaw.map((r) => r.categoryId);
    const subjects = subjectIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: subjectIds } },
          select: { id: true, name: true },
        })
      : [];
    const subjectName = new Map(subjects.map((s) => [s.id, s.name]));

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        trialActive: trialActiveUsers,
        trialExpired: trialExpiredUsers,
        online: onlineCount,
        newRegistrations24h,
      },
      questions: {
        total: totalQuestions,
        published: publishedQuestions,
        draft: draftQuestions,
        archived: archivedQuestions,
      },
      categories: totalCategories,
      news: totalNews,
      documents: totalDocuments,
      browsingSecondsTotal: browsingAgg._sum.accruedSeconds ?? 0,
      engagementToday: {
        attempts: attemptsToday,
        practiceCompletes: practiceCompletesToday,
        activeSeconds: activeSecondsToday._sum.accruedSeconds ?? 0,
      },
      topSubjects: topSubjectsRaw.map((row) => ({
        categoryId: row.categoryId,
        name: subjectName.get(row.categoryId) ?? 'Unknown',
        attempts: row._count.id,
      })),
      recentUsers,
      recentActivity: recentActivity.map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        createdAt: row.createdAt.toISOString(),
        actor: row.actor
          ? { id: row.actor.id, name: row.actor.name, role: row.actor.role }
          : null,
      })),
      onlineHeartbeatWindowMs: ONLINE_HEARTBEAT_WINDOW_MS,
    };
  }

  async listUsers(params: {
    q?: string;
    status?: UserStatus;
    cursor?: string;
    limit?: number;
    createdFrom?: string;
    createdTo?: string;
  }) {
    const limit = Math.min(params.limit ?? 50, 100);
    const now = new Date();
    const onlineSince = this.learningActivity.onlineSince(now);

    const createdAtFilter: Prisma.DateTimeFilter | undefined =
      params.createdFrom || params.createdTo
        ? {
            ...(params.createdFrom ? { gte: new Date(params.createdFrom) } : {}),
            ...(params.createdTo ? { lte: new Date(params.createdTo) } : {}),
          }
        : undefined;

    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(params.status ? { status: params.status } : {}),
        ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
        ...(params.q
          ? {
              OR: [
                { name: { contains: params.q, mode: 'insensitive' } },
                { whatsappNumber: { contains: params.q } },
                { email: { contains: params.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        email: true,
        role: true,
        status: true,
        trialEndsAt: true,
        trialStartedAt: true,
        createdAt: true,
        avatarAssetId: true,
        avatarAsset: {
          select: { id: true, publicId: true, deliveryType: true },
        },
        browsingSessions: {
          where: { status: BrowsingSessionStatus.ACTIVE },
          orderBy: { lastHeartbeatAt: 'desc' },
          take: 1,
          select: { lastHeartbeatAt: true, accruedSeconds: true },
        },
        _count: {
          select: {
            questionAttempts: true,
            practiceAttempts: true,
          },
        },
        subscriptions: {
          where: { status: SubscriptionStatus.ACTIVE, endsAt: { gt: now } },
          orderBy: { endsAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            startsAt: true,
            endsAt: true,
            plan: { select: { id: true, code: true, name: true } },
          },
        },
      },
    });

    const nextCursor = users.length > limit ? users[limit]?.id ?? null : null;
    const page = users.slice(0, limit);

    return {
      items: page.map((u) => {
        const lastSession = u.browsingSessions[0] ?? null;
        const online =
          lastSession != null && lastSession.lastHeartbeatAt.getTime() >= onlineSince.getTime();
        const trialActive = u.trialEndsAt > now && u.trialStartedAt <= now;
        const sub = u.subscriptions[0] ?? null;
        return {
          id: u.id,
          name: u.name,
          whatsappNumber: u.whatsappNumber,
          email: u.email,
          role: u.role,
          status: u.status,
          trialEndsAt: u.trialEndsAt.toISOString(),
          trialStartedAt: u.trialStartedAt.toISOString(),
          trialActive,
          createdAt: u.createdAt.toISOString(),
          avatarAssetId: u.avatarAssetId,
          lastHeartbeatAt: lastSession?.lastHeartbeatAt.toISOString() ?? null,
          online,
          attemptCount: u._count.questionAttempts,
          practiceAttemptCount: u._count.practiceAttempts,
          subscription: sub
            ? {
                id: sub.id,
                status: sub.status,
                startsAt: sub.startsAt.toISOString(),
                endsAt: sub.endsAt.toISOString(),
                plan: sub.plan,
              }
            : null,
        };
      }),
      nextCursor,
    };
  }

  async getUser(id: string) {
    const now = new Date();
    const onlineSince = this.learningActivity.onlineSince(now);

    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        email: true,
        role: true,
        status: true,
        trialStartedAt: true,
        trialEndsAt: true,
        createdAt: true,
        onboardingCompletedAt: true,
        preferredCategoryIds: true,
        avatarAssetId: true,
        avatarAsset: {
          select: { id: true, publicId: true, deliveryType: true },
        },
        subscriptions: {
          orderBy: { endsAt: 'desc' },
          take: 5,
          select: {
            id: true,
            status: true,
            startsAt: true,
            endsAt: true,
            canceledAt: true,
            plan: { select: { id: true, code: true, name: true, durationDays: true } },
          },
        },
      },
    });
    if (!user) {
      throw new NotFoundException(
        createErrorResponse('USER_NOT_FOUND', 'User not found', newRequestId()),
      );
    }

    const [
      totalAttempts,
      correct,
      incorrect,
      sessionAgg,
      recentSessions,
      recentEvents,
      topicAttempts,
      onlineSession,
      practiceStats,
      recentPracticeAttempts,
    ] = await Promise.all([
      this.prisma.questionAttempt.count({ where: { userId: id } }),
      this.prisma.questionAttempt.count({ where: { userId: id, isCorrect: true } }),
      this.prisma.questionAttempt.count({ where: { userId: id, isCorrect: false } }),
      this.prisma.browsingSession.aggregate({
        where: { userId: id },
        _sum: { accruedSeconds: true },
        _count: { _all: true },
      }),
      this.prisma.browsingSession.findMany({
        where: { userId: id },
        orderBy: { startedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          lastHeartbeatAt: true,
          accruedSeconds: true,
          status: true,
        },
      }),
      this.prisma.learningActivityEvent.findMany({
        where: { userId: id },
        orderBy: { occurredAt: 'desc' },
        take: 30,
      }),
      this.prisma.questionAttempt.groupBy({
        by: ['categoryId'],
        where: { userId: id },
        _count: { id: true },
        orderBy: { _count: { categoryId: 'desc' } },
        take: 20,
      }),
      this.prisma.browsingSession.findFirst({
        where: {
          userId: id,
          status: BrowsingSessionStatus.ACTIVE,
          lastHeartbeatAt: { gte: onlineSince },
        },
        select: { lastHeartbeatAt: true },
      }),
      this.prisma.practiceAttempt.aggregate({
        where: {
          userId: id,
          status: { in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED] },
        },
        _count: { _all: true },
        _sum: {
          correctCount: true,
          wrongCount: true,
          skippedCount: true,
          score: true,
          elapsedSeconds: true,
        },
        _avg: { percentScore: true },
        _max: { percentScore: true },
      }),
      this.prisma.practiceAttempt.findMany({
        where: {
          userId: id,
          status: { in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED] },
        },
        orderBy: { submittedAt: 'desc' },
        take: 15,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          elapsedSeconds: true,
          score: true,
          maxScore: true,
          percentScore: true,
          passed: true,
          correctCount: true,
          wrongCount: true,
          skippedCount: true,
          practiceSet: {
            select: {
              id: true,
              title: true,
              kind: true,
              examTag: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      }),
    ]);

    const categoryIds = topicAttempts.map((t) => t.categoryId);
    const categories = categoryIds.length
      ? await this.prisma.category.findMany({
          where: { id: { in: categoryIds } },
          select: { id: true, name: true, parentId: true },
        })
      : [];
    const catMap = new Map(categories.map((c) => [c.id, c]));

    // Observed engagement: ≥3 attempts before listing
    const observedEngagement = topicAttempts
      .filter((t) => t._count.id >= 3)
      .map((t) => {
        const cat = catMap.get(t.categoryId);
        return {
          categoryId: t.categoryId,
          name: cat?.name ?? 'Unknown',
          attempts: t._count.id,
          score: t._count.id,
        };
      });

    const activeSub =
      user.subscriptions.find((s) => s.status === SubscriptionStatus.ACTIVE && s.endsAt > now) ??
      null;

    return {
      profile: {
        id: user.id,
        name: user.name,
        whatsappNumber: user.whatsappNumber,
        email: user.email,
        role: user.role,
        status: user.status,
        trialStartedAt: user.trialStartedAt.toISOString(),
        trialEndsAt: user.trialEndsAt.toISOString(),
        trialActive: user.trialEndsAt > now && user.trialStartedAt <= now,
        createdAt: user.createdAt.toISOString(),
        onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
        preferredCategoryIds: user.preferredCategoryIds,
        avatarAssetId: user.avatarAssetId,
        online: Boolean(onlineSession),
        lastHeartbeatAt: onlineSession?.lastHeartbeatAt.toISOString() ?? null,
      },
      subscription: activeSub
        ? {
            id: activeSub.id,
            status: activeSub.status,
            startsAt: activeSub.startsAt.toISOString(),
            endsAt: activeSub.endsAt.toISOString(),
            canceledAt: activeSub.canceledAt?.toISOString() ?? null,
            plan: activeSub.plan,
          }
        : null,
      subscriptions: user.subscriptions.map((s) => ({
        id: s.id,
        status: s.status,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        canceledAt: s.canceledAt?.toISOString() ?? null,
        plan: s.plan,
      })),
      study: {
        activeSeconds: sessionAgg._sum.accruedSeconds ?? 0,
        sessionCount: sessionAgg._count._all,
        attempts: totalAttempts,
        correct,
        incorrect,
        practiceCompletes: practiceStats._count._all,
        practiceCorrect: practiceStats._sum.correctCount ?? 0,
        practiceWrong: practiceStats._sum.wrongCount ?? 0,
        practiceSkipped: practiceStats._sum.skippedCount ?? 0,
        practiceMarks: practiceStats._sum.score ?? 0,
        practiceAvgPercent:
          practiceStats._avg.percentScore != null
            ? Math.round(practiceStats._avg.percentScore * 10) / 10
            : 0,
        practiceBestPercent:
          practiceStats._max.percentScore != null
            ? Math.round(practiceStats._max.percentScore * 10) / 10
            : 0,
        practiceTimeSeconds: practiceStats._sum.elapsedSeconds ?? 0,
      },
      recentPracticeAttempts: recentPracticeAttempts.map((a) => ({
        id: a.id,
        status: a.status,
        submittedAt: a.submittedAt?.toISOString() ?? null,
        elapsedSeconds: a.elapsedSeconds,
        score: a.score,
        maxScore: a.maxScore,
        percentScore: a.percentScore,
        passed: a.passed,
        correctCount: a.correctCount,
        wrongCount: a.wrongCount,
        skippedCount: a.skippedCount,
        practiceSet: a.practiceSet,
      })),
      observedEngagement,
      sessions: recentSessions.map((s) => ({
        id: s.id,
        startedAt: s.startedAt.toISOString(),
        endedAt: s.endedAt?.toISOString() ?? null,
        lastHeartbeatAt: s.lastHeartbeatAt.toISOString(),
        accruedSeconds: s.accruedSeconds,
        status: s.status,
        wallSeconds: Math.max(
          0,
          Math.floor(
            ((s.endedAt ?? (s.status === BrowsingSessionStatus.ACTIVE ? now : s.lastHeartbeatAt))
              .getTime() -
              s.startedAt.getTime()) /
              1000,
          ),
        ),
      })),
      recentEvents: recentEvents.map((e) => this.mapEvent(e)),
    };
  }

  async updateUserStatus(id: string, status: UserStatus, actorUserId?: string) {
    if (status !== UserStatus.ACTIVE && status !== UserStatus.SUSPENDED) {
      throw new BadRequestException(
        createErrorResponse(
          'VALIDATION_ERROR',
          'Status must be ACTIVE or SUSPENDED',
          newRequestId(),
        ),
      );
    }
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, role: true },
    });
    if (!user) {
      throw new NotFoundException(
        createErrorResponse('USER_NOT_FOUND', 'User not found', newRequestId()),
      );
    }
    if (user.role === UserRole.ADMIN && status === UserStatus.SUSPENDED) {
      throw new ForbiddenException(
        createErrorResponse(
          'FORBIDDEN',
          'Cannot suspend admin accounts via this endpoint',
          newRequestId(),
        ),
      );
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        name: true,
        whatsappNumber: true,
        email: true,
        role: true,
        status: true,
        trialEndsAt: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: actorUserId ?? null,
        action: status === UserStatus.SUSPENDED ? 'USER_SUSPEND' : 'USER_REINSTATE',
        entityType: 'user',
        entityId: id,
        metadata: { status },
      },
    });

    return {
      ...updated,
      trialEndsAt: updated.trialEndsAt.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    };
  }

  async activityOverview() {
    const now = new Date();
    const onlineSince = this.learningActivity.onlineSince(now);
    const m5 = new Date(now.getTime() - 5 * 60 * 1000);
    const m15 = new Date(now.getTime() - 15 * 60 * 1000);
    const m30 = new Date(now.getTime() - 30 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      registered,
      online,
      sessionsActive,
      heartbeats5,
      heartbeats15,
      heartbeats30,
      attemptsToday,
      attempts7d,
      attempts30d,
      practiceToday,
      practice7d,
      practice30d,
      activeToday,
      active7d,
      active30d,
    ] = await Promise.all([
      this.prisma.user.count({ where: { deletedAt: null } }),
      this.prisma.browsingSession.count({
        where: {
          status: BrowsingSessionStatus.ACTIVE,
          lastHeartbeatAt: { gte: onlineSince },
        },
      }),
      this.prisma.browsingSession.count({
        where: { status: BrowsingSessionStatus.ACTIVE },
      }),
      this.countDistinctUsersWithHeartbeat(m5),
      this.countDistinctUsersWithHeartbeat(m15),
      this.countDistinctUsersWithHeartbeat(m30),
      this.prisma.questionAttempt.count({ where: { createdAt: { gte: dayAgo } } }),
      this.prisma.questionAttempt.count({ where: { createdAt: { gte: weekAgo } } }),
      this.prisma.questionAttempt.count({ where: { createdAt: { gte: monthAgo } } }),
      this.prisma.practiceAttempt.count({
        where: {
          submittedAt: { gte: dayAgo },
          status: { in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED] },
        },
      }),
      this.prisma.practiceAttempt.count({
        where: {
          submittedAt: { gte: weekAgo },
          status: { in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED] },
        },
      }),
      this.prisma.practiceAttempt.count({
        where: {
          submittedAt: { gte: monthAgo },
          status: { in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED] },
        },
      }),
      this.sumAccruedSince(dayAgo),
      this.sumAccruedSince(weekAgo),
      this.sumAccruedSince(monthAgo),
    ]);

    return {
      registered,
      online,
      sessionsActive,
      onlineBuckets: { m5: heartbeats5, m15: heartbeats15, m30: heartbeats30 },
      engagement: {
        today: { attempts: attemptsToday, practiceCompletes: practiceToday, activeSeconds: activeToday },
        d7: { attempts: attempts7d, practiceCompletes: practice7d, activeSeconds: active7d },
        d30: { attempts: attempts30d, practiceCompletes: practice30d, activeSeconds: active30d },
      },
      onlineHeartbeatWindowMs: ONLINE_HEARTBEAT_WINDOW_MS,
    };
  }

  async activityOnline(params: { q?: string; limit?: number }) {
    const limit = Math.min(params.limit ?? 50, 100);
    const onlineSince = this.learningActivity.onlineSince();

    const sessions = await this.prisma.browsingSession.findMany({
      where: {
        status: BrowsingSessionStatus.ACTIVE,
        lastHeartbeatAt: { gte: onlineSince },
        ...(params.q
          ? {
              user: {
                deletedAt: null,
                OR: [
                  { name: { contains: params.q, mode: 'insensitive' } },
                  { whatsappNumber: { contains: params.q } },
                  { email: { contains: params.q, mode: 'insensitive' } },
                ],
              },
            }
          : { user: { deletedAt: null } }),
      },
      orderBy: { lastHeartbeatAt: 'desc' },
      take: limit,
      select: {
        id: true,
        startedAt: true,
        lastHeartbeatAt: true,
        accruedSeconds: true,
        user: {
          select: {
            id: true,
            name: true,
            whatsappNumber: true,
            email: true,
            role: true,
            status: true,
          },
        },
      },
    });

    return {
      items: sessions.map((s) => ({
        sessionId: s.id,
        startedAt: s.startedAt.toISOString(),
        lastHeartbeatAt: s.lastHeartbeatAt.toISOString(),
        accruedSeconds: s.accruedSeconds,
        user: s.user,
      })),
      onlineHeartbeatWindowMs: ONLINE_HEARTBEAT_WINDOW_MS,
    };
  }

  async activityEvents(params: {
    userId?: string;
    type?: string;
    subjectId?: string;
    from?: string;
    to?: string;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 50, 100);
    const type = this.parseActivityType(params.type);
    const where: Prisma.LearningActivityEventWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(type ? { type } : {}),
      ...(params.subjectId ? { subjectCategoryId: params.subjectId } : {}),
      ...(params.from || params.to
        ? {
            occurredAt: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    };

    const rows = await this.prisma.learningActivityEvent.findMany({
      where,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, whatsappNumber: true } },
      },
    });
    const nextCursor = rows.length > limit ? rows[limit]?.id ?? null : null;
    const page = rows.slice(0, limit);

    return {
      items: page.map((e) => ({
        ...this.mapEvent(e),
        user: e.user,
      })),
      nextCursor,
    };
  }

  async activityTrends(params: { from?: string; to?: string }) {
    const now = new Date();
    const to = params.to ? new Date(params.to) : now;
    const from = params.from
      ? new Date(params.from)
      : new Date(to.getTime() - 13 * 24 * 60 * 60 * 1000);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new BadRequestException(
        createErrorResponse('VALIDATION_ERROR', 'Invalid date range', newRequestId()),
      );
    }

    const days = this.eachUtcDay(from, to);

    const [attempts, practices, sessions] = await Promise.all([
      this.prisma.questionAttempt.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { createdAt: true, isCorrect: true },
      }),
      this.prisma.practiceAttempt.findMany({
        where: {
          submittedAt: { gte: from, lte: to },
          status: { in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED] },
        },
        select: { submittedAt: true },
      }),
      this.prisma.browsingSession.findMany({
        where: { lastHeartbeatAt: { gte: from, lte: to } },
        select: { lastHeartbeatAt: true, accruedSeconds: true, startedAt: true },
      }),
    ]);

    const series = days.map((day) => {
      const key = day.toISOString().slice(0, 10);
      const dayStart = day.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const dayAttempts = attempts.filter((a) => {
        const t = a.createdAt.getTime();
        return t >= dayStart && t < dayEnd;
      });
      const dayPractice = practices.filter((p) => {
        const t = p.submittedAt?.getTime() ?? 0;
        return t >= dayStart && t < dayEnd;
      });
      // Attribute accrued seconds to the day of lastHeartbeat (on-read approx).
      const activeSeconds = sessions
        .filter((s) => {
          const t = s.lastHeartbeatAt.getTime();
          return t >= dayStart && t < dayEnd;
        })
        .reduce((sum, s) => sum + s.accruedSeconds, 0);

      return {
        date: key,
        attempts: dayAttempts.length,
        correct: dayAttempts.filter((a) => a.isCorrect).length,
        practiceCompletes: dayPractice.length,
        activeSeconds,
      };
    });

    return { from: from.toISOString(), to: to.toISOString(), series };
  }

  async activityExport(params: {
    userId?: string;
    type?: string;
    subjectId?: string;
    from?: string;
    to?: string;
  }): Promise<{ filename: string; csv: string }> {
    const type = this.parseActivityType(params.type);
    const where: Prisma.LearningActivityEventWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(type ? { type } : {}),
      ...(params.subjectId ? { subjectCategoryId: params.subjectId } : {}),
      ...(params.from || params.to
        ? {
            occurredAt: {
              ...(params.from ? { gte: new Date(params.from) } : {}),
              ...(params.to ? { lte: new Date(params.to) } : {}),
            },
          }
        : {}),
    };

    const rows = await this.prisma.learningActivityEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
      take: 5000,
      include: {
        user: { select: { id: true, name: true, whatsappNumber: true } },
      },
    });

    const header = [
      'id',
      'occurredAt',
      'type',
      'userId',
      'userName',
      'whatsappNumber',
      'subjectCategoryId',
      'topicCategoryId',
      'questionId',
      'practiceSetId',
      'practiceAttemptId',
    ];
    const lines = [header.join(',')];
    for (const row of rows) {
      lines.push(
        [
          row.id,
          row.occurredAt.toISOString(),
          row.type,
          row.userId,
          this.csvEscape(row.user.name),
          this.csvEscape(row.user.whatsappNumber),
          row.subjectCategoryId ?? '',
          row.topicCategoryId ?? '',
          row.questionId ?? '',
          row.practiceSetId ?? '',
          row.practiceAttemptId ?? '',
        ].join(','),
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    return { filename: `activity-events-${stamp}.csv`, csv: lines.join('\n') };
  }

  async listAudit(params: { cursor?: string; limit?: number; action?: string }) {
    const limit = Math.min(params.limit ?? 50, 100);
    const rows = await this.prisma.auditLog.findMany({
      where: {
        ...(params.action ? { action: params.action } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      include: {
        actor: { select: { id: true, name: true, role: true } },
      },
    });
    const nextCursor = rows.length > limit ? rows[limit]?.id ?? null : null;
    return {
      items: rows.slice(0, limit).map((row) => ({
        id: row.id,
        action: row.action,
        entityType: row.entityType,
        entityId: row.entityId,
        metadata: row.metadata,
        createdAt: row.createdAt.toISOString(),
        actor: row.actor
          ? { id: row.actor.id, name: row.actor.name, role: row.actor.role }
          : null,
      })),
      nextCursor,
    };
  }

  private async countDistinctUsersWithHeartbeat(since: Date): Promise<number> {
    const rows = await this.prisma.browsingSession.findMany({
      where: { lastHeartbeatAt: { gte: since } },
      distinct: ['userId'],
      select: { userId: true },
    });
    return rows.length;
  }

  private async sumAccruedSince(since: Date): Promise<number> {
    const agg = await this.prisma.browsingSession.aggregate({
      where: { lastHeartbeatAt: { gte: since } },
      _sum: { accruedSeconds: true },
    });
    return agg._sum.accruedSeconds ?? 0;
  }

  private parseActivityType(raw?: string): LearningActivityType | undefined {
    if (!raw) return undefined;
    if (!ACTIVITY_TYPES.has(raw)) {
      throw new BadRequestException(
        createErrorResponse('VALIDATION_ERROR', 'Invalid activity type', newRequestId()),
      );
    }
    return raw as LearningActivityType;
  }

  private mapEvent(e: {
    id: string;
    userId: string;
    type: LearningActivityType;
    occurredAt: Date;
    subjectCategoryId: string | null;
    topicCategoryId: string | null;
    questionId: string | null;
    practiceSetId: string | null;
    practiceAttemptId: string | null;
    meta: Prisma.JsonValue;
  }) {
    return {
      id: e.id,
      userId: e.userId,
      type: e.type,
      occurredAt: e.occurredAt.toISOString(),
      subjectCategoryId: e.subjectCategoryId,
      topicCategoryId: e.topicCategoryId,
      questionId: e.questionId,
      practiceSetId: e.practiceSetId,
      practiceAttemptId: e.practiceAttemptId,
      meta: e.meta,
    };
  }

  private eachUtcDay(from: Date, to: Date): Date[] {
    const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    const end = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
    const days: Date[] = [];
    for (let t = start; t <= end; t += 24 * 60 * 60 * 1000) {
      days.push(new Date(t));
    }
    return days;
  }

  private csvEscape(value: string): string {
    if (/[",\n]/.test(value)) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
