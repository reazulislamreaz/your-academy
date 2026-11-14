import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  PracticeAttemptStatus,
  PracticeSetKind,
  PracticeSetStatus,
  Prisma,
  QuestionStatus,
} from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { LearningActivityService } from '../learning-activity/learning-activity.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import type {
  CreatePracticeSetDto,
  SaveProgressDto,
  SubmitAttemptDto,
  UpdatePracticeSetDto,
} from './dto/submit-attempt.dto';

const KIND_VALUES = new Set<string>(Object.values(PracticeSetKind));

type OptionSnapshot = {
  id: string;
  label: string;
  content: string;
  sortOrder: number;
  isCorrect: boolean;
};

@Injectable()
export class PracticeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
    private readonly learningActivity: LearningActivityService,
  ) {}

  async listPublished(params: {
    kind?: string;
    examTag?: string;
    categoryId?: string;
    subcategoryId?: string;
    isDaily?: boolean;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const kind = this.parseKind(params.kind);
    const where: Prisma.PracticeSetWhereInput = {
      status: PracticeSetStatus.PUBLISHED,
      ...(kind ? { kind } : {}),
      ...(params.examTag ? { examTag: params.examTag } : {}),
      ...(params.categoryId ? { categoryId: params.categoryId } : {}),
      ...(params.subcategoryId ? { subcategoryId: params.subcategoryId } : {}),
      ...(params.isDaily !== undefined ? { isDaily: params.isDaily } : {}),
    };

    const items = await this.prisma.practiceSet.findMany({
      where,
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        kind: true,
        durationSeconds: true,
        marksPerCorrect: true,
        negativeMarkPerWrong: true,
        passMarkPercent: true,
        examTag: true,
        isDaily: true,
        publishedAt: true,
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
        _count: { select: { items: true } },
      },
    });

    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return {
      items: items.map(({ _count, ...rest }) => ({
        ...rest,
        questionCount: _count.items,
      })),
      nextCursor,
    };
  }

  async getPublishedDetail(user: RequestUser, idOrSlug: string) {
    const set = await this.findPublishedSet(idOrSlug);
    // Expire stale in-progress attempts before exposing activeAttempt.
    await this.autoFinalizeIfExpired(user.userId, set.id);

    const items = await this.prisma.practiceSetItem.findMany({
      where: { practiceSetId: set.id },
      orderBy: { sortOrder: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            content: true,
            difficulty: true,
            options: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, label: true, content: true, sortOrder: true },
            },
          },
        },
      },
    });

    const activeAttempt = await this.findActiveAttempt(user.userId, set.id);

    return {
      id: set.id,
      title: set.title,
      slug: set.slug,
      description: set.description,
      kind: set.kind,
      durationSeconds: set.durationSeconds,
      marksPerCorrect: set.marksPerCorrect,
      negativeMarkPerWrong: set.negativeMarkPerWrong,
      passMarkPercent: set.passMarkPercent,
      examTag: set.examTag,
      isDaily: set.isDaily,
      publishedAt: set.publishedAt,
      category: set.category,
      subcategory: set.subcategory,
      questionCount: items.length,
      questions: items.map((item) => ({
        sortOrder: item.sortOrder,
        ...item.question,
      })),
      activeAttempt,
      serverNow: new Date().toISOString(),
    };
  }

  async startAttempt(user: RequestUser, idOrSlug: string) {
    const set = await this.findPublishedSet(idOrSlug);
    await this.autoFinalizeIfExpired(user.userId, set.id);

    const existing = await this.findActiveAttempt(user.userId, set.id);
    if (existing) return existing;

    const itemCount = await this.prisma.practiceSetItem.count({
      where: { practiceSetId: set.id },
    });
    if (itemCount < 1) {
      throw new BadRequestException(
        createErrorResponse(
          'PRACTICE_SET_EMPTY',
          'This practice set has no questions',
          newRequestId(),
        ),
      );
    }

    const attempt = await this.prisma.practiceAttempt.create({
      data: {
        userId: user.userId,
        practiceSetId: set.id,
        status: PracticeAttemptStatus.IN_PROGRESS,
        maxScore: itemCount * set.marksPerCorrect,
      },
      select: {
        id: true,
        practiceSetId: true,
        status: true,
        startedAt: true,
        maxScore: true,
      },
    });

    await this.learningActivity.record({
      userId: user.userId,
      type: 'PRACTICE_START',
      subjectCategoryId: set.categoryId,
      topicCategoryId: set.subcategoryId,
      practiceSetId: set.id,
      practiceAttemptId: attempt.id,
    });

    return this.mapActiveAttempt(attempt, set.durationSeconds, []);
  }

  /** Persist in-progress answers so refresh / disconnect does not lose work. */
  async saveProgress(user: RequestUser, attemptId: string, dto: SaveProgressDto) {
    const attempt = await this.prisma.practiceAttempt.findUnique({
      where: { id: attemptId },
      include: { practiceSet: { select: { id: true, durationSeconds: true } } },
    });
    if (!attempt || attempt.userId !== user.userId) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }
    if (attempt.status !== PracticeAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException(
        createErrorResponse('ATTEMPT_ALREADY_SUBMITTED', 'Attempt already submitted', newRequestId()),
      );
    }

    if (this.isTimedOut(attempt.startedAt, attempt.practiceSet.durationSeconds)) {
      // Deadline passed — finalize with whatever we have + incoming payload.
      return this.submitAttempt(user, attemptId, { answers: dto.answers });
    }

    const setQuestionIds = await this.prisma.practiceSetItem.findMany({
      where: { practiceSetId: attempt.practiceSetId },
      select: { questionId: true },
    });
    const allowed = new Set(setQuestionIds.map((q) => q.questionId));
    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      for (const row of dto.answers) {
        if (!allowed.has(row.questionId)) continue;
        const selectedOptionId = row.selectedOptionId ?? null;
        if (selectedOptionId) {
          const ok = await tx.questionOption.findFirst({
            where: { id: selectedOptionId, questionId: row.questionId },
            select: { id: true },
          });
          if (!ok) {
            throw new BadRequestException(
              createErrorResponse(
                'INVALID_OPTION',
                'Selected option does not belong to this question',
                newRequestId(),
              ),
            );
          }
        }
        await tx.practiceAttemptAnswer.upsert({
          where: {
            attemptId_questionId: { attemptId, questionId: row.questionId },
          },
          create: {
            attemptId,
            questionId: row.questionId,
            selectedOptionId,
            isCorrect: null,
            answeredAt: now,
          },
          update: {
            selectedOptionId,
            answeredAt: now,
          },
        });
      }
    });

    const saved = await this.prisma.practiceAttemptAnswer.findMany({
      where: { attemptId, selectedOptionId: { not: null } },
      select: { questionId: true, selectedOptionId: true },
    });

    return {
      attemptId,
      status: attempt.status,
      savedCount: saved.length,
      answers: saved.map((a) => ({
        questionId: a.questionId,
        selectedOptionId: a.selectedOptionId,
      })),
      expiresAt: this.expiresAtIso(attempt.startedAt, attempt.practiceSet.durationSeconds),
      serverNow: new Date().toISOString(),
    };
  }

  async submitAttempt(user: RequestUser, attemptId: string, dto: SubmitAttemptDto) {
    const attempt = await this.prisma.practiceAttempt.findUnique({
      where: { id: attemptId },
      include: {
        practiceSet: true,
        answers: true,
      },
    });
    if (!attempt || attempt.userId !== user.userId) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }
    if (attempt.status !== PracticeAttemptStatus.IN_PROGRESS) {
      // Idempotent: return existing result on duplicate submit.
      return this.getAttemptResult(user, attemptId);
    }

    const set = attempt.practiceSet;
    const timedOut = this.isTimedOut(attempt.startedAt, set.durationSeconds);
    const submittedAt = new Date();
    const elapsedSeconds = this.computeElapsedSeconds(
      attempt.startedAt,
      submittedAt,
      set.durationSeconds,
    );

    // Merge client payload over saved progress (client wins for overlapping keys).
    const answerByQuestion = new Map<string, string | null>();
    for (const saved of attempt.answers) {
      answerByQuestion.set(saved.questionId, saved.selectedOptionId);
    }
    for (const a of dto.answers) {
      answerByQuestion.set(a.questionId, a.selectedOptionId ?? null);
    }

    const items = await this.prisma.practiceSetItem.findMany({
      where: { practiceSetId: set.id },
      include: {
        question: {
          include: {
            options: {
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                label: true,
                content: true,
                sortOrder: true,
                isCorrect: true,
              },
            },
          },
        },
      },
    });

    let correctCount = 0;
    let wrongCount = 0;
    let skippedCount = 0;
    let score = 0;
    const answerRows: Array<{
      questionId: string;
      selectedOptionId: string | null;
      isCorrect: boolean | null;
      questionTitleSnapshot: string;
      questionContentSnapshot: string;
      explanationSnapshot: string | null;
      optionsSnapshot: OptionSnapshot[];
    }> = [];

    for (const item of items) {
      const selectedOptionId = answerByQuestion.get(item.questionId) ?? null;
      const optionsSnapshot: OptionSnapshot[] = item.question.options.map((o) => ({
        id: o.id,
        label: o.label,
        content: o.content,
        sortOrder: o.sortOrder,
        isCorrect: o.isCorrect,
      }));
      const base = {
        questionId: item.questionId,
        questionTitleSnapshot: item.question.title.slice(0, 200),
        questionContentSnapshot: item.question.content,
        explanationSnapshot: item.question.explanation ?? null,
        optionsSnapshot,
      };

      if (!selectedOptionId) {
        skippedCount += 1;
        answerRows.push({
          ...base,
          selectedOptionId: null,
          isCorrect: null,
        });
        continue;
      }
      const option = item.question.options.find((o) => o.id === selectedOptionId);
      if (!option) {
        throw new BadRequestException(
          createErrorResponse(
            'INVALID_OPTION',
            'Selected option does not belong to this question',
            newRequestId(),
          ),
        );
      }
      if (option.isCorrect) {
        correctCount += 1;
        score += set.marksPerCorrect;
        answerRows.push({ ...base, selectedOptionId, isCorrect: true });
      } else {
        wrongCount += 1;
        score -= set.negativeMarkPerWrong;
        answerRows.push({ ...base, selectedOptionId, isCorrect: false });
      }
    }

    const maxScore = items.length * set.marksPerCorrect;
    const percentScore =
      maxScore <= 0 ? 0 : Math.round((Math.max(0, score) / maxScore) * 1000) / 10;
    const passed =
      set.passMarkPercent == null ? null : percentScore >= set.passMarkPercent;
    const status = timedOut ? PracticeAttemptStatus.EXPIRED : PracticeAttemptStatus.SUBMITTED;

    // Concurrent-safe finalize: only one submit wins.
    const claimed = await this.prisma.practiceAttempt.updateMany({
      where: { id: attemptId, status: PracticeAttemptStatus.IN_PROGRESS },
      data: {
        status,
        submittedAt,
        elapsedSeconds,
        score,
        maxScore,
        percentScore,
        passed,
        correctCount,
        wrongCount,
        skippedCount,
      },
    });
    if (claimed.count === 0) {
      return this.getAttemptResult(user, attemptId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.practiceAttemptAnswer.deleteMany({ where: { attemptId } });
      await tx.practiceAttemptAnswer.createMany({
        data: answerRows.map((row) => ({
          attemptId,
          questionId: row.questionId,
          selectedOptionId: row.selectedOptionId,
          isCorrect: row.isCorrect,
          answeredAt: submittedAt,
          questionTitleSnapshot: row.questionTitleSnapshot,
          questionContentSnapshot: row.questionContentSnapshot,
          explanationSnapshot: row.explanationSnapshot,
          optionsSnapshot: row.optionsSnapshot,
        })),
      });
    });

    await this.learningActivity.record({
      userId: user.userId,
      type: 'PRACTICE_SUBMIT',
      subjectCategoryId: set.categoryId,
      topicCategoryId: set.subcategoryId,
      practiceSetId: set.id,
      practiceAttemptId: attemptId,
      meta: {
        status,
        correctCount,
        wrongCount,
        skippedCount,
        score,
        percentScore,
        elapsedSeconds,
        passed,
      },
    });

    return this.getAttemptResult(user, attemptId);
  }

  async getAttemptResult(user: RequestUser, attemptId: string, opts?: { asAdmin?: boolean }) {
    const attempt = await this.prisma.practiceAttempt.findUnique({
      where: { id: attemptId },
      include: {
        practiceSet: {
          select: {
            id: true,
            title: true,
            slug: true,
            kind: true,
            durationSeconds: true,
            marksPerCorrect: true,
            negativeMarkPerWrong: true,
            passMarkPercent: true,
            examTag: true,
            category: { select: { id: true, name: true, slug: true } },
            subcategory: { select: { id: true, name: true, slug: true } },
          },
        },
        answers: true,
        user: opts?.asAdmin
          ? { select: { id: true, name: true, whatsappNumber: true } }
          : false,
      },
    });
    if (!attempt) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }
    if (!opts?.asAdmin && attempt.userId !== user.userId) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }

    const viewerId = opts?.asAdmin ? user.userId : attempt.userId;
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: viewerId } });
    // Admin viewing another user's result: show answers if admin is entitled (DEC-014 proposed).
    const canView = await this.access.canViewAnswers(dbUser);

    const totalQuestions = attempt.correctCount != null
      ? (attempt.correctCount ?? 0) + (attempt.wrongCount ?? 0) + (attempt.skippedCount ?? 0)
      : await this.prisma.practiceSetItem.count({ where: { practiceSetId: attempt.practiceSetId } });
    const attempted = (attempt.correctCount ?? 0) + (attempt.wrongCount ?? 0);
    const unanswered = attempt.skippedCount ?? Math.max(0, totalQuestions - attempted);
    const percentScore =
      attempt.percentScore ??
      (attempt.maxScore && attempt.maxScore > 0 && attempt.score != null
        ? Math.round((Math.max(0, attempt.score) / attempt.maxScore) * 1000) / 10
        : null);
    const elapsedSeconds =
      attempt.elapsedSeconds ??
      (attempt.submittedAt
        ? this.computeElapsedSeconds(
            attempt.startedAt,
            attempt.submittedAt,
            attempt.practiceSet.durationSeconds,
          )
        : null);

    // Prefer snapshots for historical fidelity; fall back to live question rows.
    let review: Array<Record<string, unknown>>;
    if (attempt.answers.some((a) => a.optionsSnapshot != null)) {
      review = attempt.answers.map((answer) => {
        const optionsRaw = (answer.optionsSnapshot as OptionSnapshot[] | null) ?? [];
        const options = optionsRaw
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((o) =>
            this.access.stripAnswerFields(
              {
                id: o.id,
                label: o.label,
                content: o.content,
                sortOrder: o.sortOrder,
                isCorrect: o.isCorrect,
              },
              canView,
            ),
          );
        return {
          questionId: answer.questionId,
          title: answer.questionTitleSnapshot ?? 'Question',
          content: answer.questionContentSnapshot ?? '',
          difficulty: 'MEDIUM',
          selectedOptionId: answer.selectedOptionId ?? null,
          unanswered: !answer.selectedOptionId,
          ...(canView
            ? {
                isCorrect: answer.isCorrect ?? null,
                explanation: answer.explanationSnapshot ?? undefined,
              }
            : {}),
          options,
        };
      });
      // Keep set order when possible
      const order = await this.prisma.practiceSetItem.findMany({
        where: { practiceSetId: attempt.practiceSetId },
        orderBy: { sortOrder: 'asc' },
        select: { questionId: true },
      });
      const orderMap = new Map(order.map((o, i) => [o.questionId, i]));
      review.sort(
        (a, b) =>
          (orderMap.get(a.questionId as string) ?? 999) -
          (orderMap.get(b.questionId as string) ?? 999),
      );
    } else {
      const items = await this.prisma.practiceSetItem.findMany({
        where: { practiceSetId: attempt.practiceSetId },
        orderBy: { sortOrder: 'asc' },
        include: {
          question: {
            include: {
              options: { orderBy: { sortOrder: 'asc' } },
            },
          },
        },
      });
      const answerMap = new Map(attempt.answers.map((a) => [a.questionId, a]));
      review = items.map((item) => {
        const answer = answerMap.get(item.questionId);
        const options = item.question.options.map((o) =>
          this.access.stripAnswerFields(
            {
              id: o.id,
              label: o.label,
              content: o.content,
              sortOrder: o.sortOrder,
              isCorrect: o.isCorrect,
            },
            canView,
          ),
        );
        return {
          questionId: item.questionId,
          title: item.question.title,
          content: item.question.content,
          difficulty: item.question.difficulty,
          selectedOptionId: answer?.selectedOptionId ?? null,
          unanswered: !answer?.selectedOptionId,
          ...(canView
            ? {
                isCorrect: answer?.isCorrect ?? null,
                explanation: item.question.explanation ?? undefined,
              }
            : {}),
          options,
        };
      });
    }

    return {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      elapsedSeconds,
      score: attempt.score,
      maxScore: attempt.maxScore,
      percentScore,
      passed: attempt.passed,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      skippedCount: attempt.skippedCount,
      totalQuestions,
      attempted,
      unanswered,
      answersVisible: canView,
      practiceSet: attempt.practiceSet,
      review,
      ...(opts?.asAdmin && attempt.user
        ? {
            user: attempt.user,
          }
        : {}),
      serverNow: new Date().toISOString(),
    };
  }

  async listMyAttempts(
    user: RequestUser,
    params: { cursor?: string; limit?: number },
  ) {
    const limit = Math.min(params.limit ?? 20, 100);
    const items = await this.prisma.practiceAttempt.findMany({
      where: {
        userId: user.userId,
        status: { in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED] },
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        startedAt: true,
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
            slug: true,
            kind: true,
            examTag: true,
            category: { select: { id: true, name: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
    });
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return {
      items: items.map((a) => this.mapAttemptSummary(a)),
      nextCursor,
    };
  }

  /** Aggregated exam/practice performance for profile + dashboard. */
  async getExamPerformance(userId: string) {
    const closed: PracticeAttemptStatus[] = [
      PracticeAttemptStatus.SUBMITTED,
      PracticeAttemptStatus.EXPIRED,
    ];
    const [attempts, inProgressCount, aggregates, recent, bySetCategory] = await Promise.all([
      this.prisma.practiceAttempt.findMany({
        where: { userId, status: { in: closed } },
        select: {
          id: true,
          score: true,
          maxScore: true,
          percentScore: true,
          correctCount: true,
          wrongCount: true,
          skippedCount: true,
          elapsedSeconds: true,
          submittedAt: true,
          startedAt: true,
          practiceSet: {
            select: {
              categoryId: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { submittedAt: 'asc' },
      }),
      this.prisma.practiceAttempt.count({
        where: { userId, status: PracticeAttemptStatus.IN_PROGRESS },
      }),
      this.prisma.practiceAttempt.aggregate({
        where: { userId, status: { in: closed } },
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
        where: { userId, status: { in: closed } },
        orderBy: { submittedAt: 'desc' },
        take: 8,
        select: {
          id: true,
          status: true,
          submittedAt: true,
          percentScore: true,
          score: true,
          maxScore: true,
          practiceSet: { select: { title: true, kind: true } },
        },
      }),
      this.prisma.practiceAttempt.findMany({
        where: {
          userId,
          status: { in: closed },
          practiceSet: { categoryId: { not: null } },
        },
        select: {
          correctCount: true,
          wrongCount: true,
          percentScore: true,
          practiceSet: {
            select: { categoryId: true, category: { select: { id: true, name: true } } },
          },
        },
      }),
    ]);

    const totalExamsCompleted = aggregates._count._all;
    const totalCorrect = aggregates._sum.correctCount ?? 0;
    const totalWrong = aggregates._sum.wrongCount ?? 0;
    const totalUnanswered = aggregates._sum.skippedCount ?? 0;
    const totalAttemptedQuestions = totalCorrect + totalWrong;
    const totalMarks = aggregates._sum.score ?? 0;
    const totalTimeSeconds = aggregates._sum.elapsedSeconds ?? 0;
    const overallAccuracy =
      totalAttemptedQuestions === 0
        ? 0
        : Math.round((totalCorrect / totalAttemptedQuestions) * 1000) / 10;

    const scoreTrend = attempts
      .filter((a) => a.submittedAt)
      .map((a) => ({
        attemptId: a.id,
        date: a.submittedAt!.toISOString(),
        percentScore:
          a.percentScore ??
          (a.maxScore && a.maxScore > 0 && a.score != null
            ? Math.round((Math.max(0, a.score) / a.maxScore) * 1000) / 10
            : 0),
      }));

    const bySubjectMap = new Map<
      string,
      { categoryId: string; name: string; exams: number; correct: number; wrong: number; percentSum: number }
    >();
    for (const row of bySetCategory) {
      const cat = row.practiceSet.category;
      if (!cat) continue;
      const cur = bySubjectMap.get(cat.id) ?? {
        categoryId: cat.id,
        name: cat.name,
        exams: 0,
        correct: 0,
        wrong: 0,
        percentSum: 0,
      };
      cur.exams += 1;
      cur.correct += row.correctCount ?? 0;
      cur.wrong += row.wrongCount ?? 0;
      cur.percentSum += row.percentScore ?? 0;
      bySubjectMap.set(cat.id, cur);
    }
    const bySubject = [...bySubjectMap.values()]
      .map((s) => {
        const answered = s.correct + s.wrong;
        return {
          categoryId: s.categoryId,
          name: s.name,
          exams: s.exams,
          correct: s.correct,
          wrong: s.wrong,
          accuracyPercent: answered === 0 ? 0 : Math.round((s.correct / answered) * 1000) / 10,
          averagePercent: s.exams === 0 ? 0 : Math.round((s.percentSum / s.exams) * 10) / 10,
        };
      })
      .sort((a, b) => b.exams - a.exams);

    const strongSubjects = [...bySubject]
      .filter((s) => s.exams >= 1)
      .sort((a, b) => b.averagePercent - a.averagePercent)
      .slice(0, 3);
    const weakSubjects = [...bySubject]
      .filter((s) => s.exams >= 1)
      .sort((a, b) => a.averagePercent - b.averagePercent)
      .slice(0, 3);

    return {
      totalExamsParticipated: totalExamsCompleted + inProgressCount,
      totalExamsCompleted,
      totalExamsInProgress: inProgressCount,
      totalQuestionsAttempted: totalAttemptedQuestions,
      totalCorrect,
      totalIncorrect: totalWrong,
      totalUnanswered,
      totalMarksObtained: Math.round(totalMarks * 100) / 100,
      overallAccuracyPercent: overallAccuracy,
      averageExamScorePercent:
        aggregates._avg.percentScore != null
          ? Math.round(aggregates._avg.percentScore * 10) / 10
          : 0,
      highestExamScorePercent:
        aggregates._max.percentScore != null
          ? Math.round(aggregates._max.percentScore * 10) / 10
          : 0,
      totalTimeSpentSeconds: totalTimeSeconds,
      correctWrongRatio: {
        correct: totalCorrect,
        incorrect: totalWrong,
        unanswered: totalUnanswered,
      },
      scoreTrend,
      bySubject,
      strongSubjects,
      weakSubjects,
      recentExams: recent.map((r) => ({
        id: r.id,
        title: r.practiceSet.title,
        kind: r.practiceSet.kind,
        status: r.status,
        submittedAt: r.submittedAt?.toISOString() ?? null,
        percentScore: r.percentScore,
        score: r.score,
        maxScore: r.maxScore,
      })),
    };
  }

  async adminList(params: {
    cursor?: string;
    limit?: number;
    status?: PracticeSetStatus;
    kind?: string;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const kind = this.parseKind(params.kind);
    const items = await this.prisma.practiceSet.findMany({
      where: {
        ...(params.status ? { status: params.status } : {}),
        ...(kind ? { kind } : {}),
      },
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: {
        category: { select: { id: true, name: true } },
        subcategory: { select: { id: true, name: true } },
        _count: { select: { items: true, attempts: true } },
      },
    });
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return {
      items: items.map(({ _count, ...rest }) => ({
        ...rest,
        questionCount: _count.items,
        attemptCount: _count.attempts,
      })),
      nextCursor,
    };
  }

  async adminCreate(user: RequestUser, dto: CreatePracticeSetDto) {
    const kind = this.requireKind(dto.kind);
    if (!dto.questionIds?.length) {
      throw new BadRequestException(
        createErrorResponse(
          'PRACTICE_SET_EMPTY',
          'At least one question is required',
          newRequestId(),
        ),
      );
    }
    await this.assertQuestionsExist(dto.questionIds);

    return this.prisma.practiceSet.create({
      data: {
        title: dto.title.trim(),
        slug: dto.slug.trim(),
        description: dto.description?.trim() || null,
        kind,
        durationSeconds: dto.durationSeconds ?? null,
        marksPerCorrect: dto.marksPerCorrect ?? 1,
        negativeMarkPerWrong: dto.negativeMarkPerWrong ?? 0,
        passMarkPercent: dto.passMarkPercent ?? null,
        categoryId: dto.categoryId,
        subcategoryId: dto.subcategoryId,
        examTag: dto.examTag?.trim() || null,
        isDaily: dto.isDaily ?? false,
        createdById: user.userId,
        status: PracticeSetStatus.DRAFT,
        items: {
          create: dto.questionIds.map((questionId, index) => ({
            questionId,
            sortOrder: index,
          })),
        },
      },
      include: {
        items: true,
        category: true,
        subcategory: true,
      },
    });
  }

  async adminUpdate(id: string, dto: UpdatePracticeSetDto) {
    const set = await this.prisma.practiceSet.findUnique({ where: { id } });
    if (!set) {
      throw new NotFoundException(
        createErrorResponse('PRACTICE_SET_NOT_FOUND', 'Practice set not found', newRequestId()),
      );
    }
    if (dto.questionIds?.length) {
      await this.assertQuestionsExist(dto.questionIds);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.questionIds?.length) {
        await tx.practiceSetItem.deleteMany({ where: { practiceSetId: id } });
        await tx.practiceSetItem.createMany({
          data: dto.questionIds.map((questionId, index) => ({
            practiceSetId: id,
            questionId,
            sortOrder: index,
          })),
        });
      }
      return tx.practiceSet.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
          ...(dto.description !== undefined
            ? { description: dto.description?.trim() || null }
            : {}),
          ...(dto.durationSeconds !== undefined ? { durationSeconds: dto.durationSeconds } : {}),
          ...(dto.marksPerCorrect !== undefined ? { marksPerCorrect: dto.marksPerCorrect } : {}),
          ...(dto.negativeMarkPerWrong !== undefined
            ? { negativeMarkPerWrong: dto.negativeMarkPerWrong }
            : {}),
          ...(dto.passMarkPercent !== undefined ? { passMarkPercent: dto.passMarkPercent } : {}),
          ...(dto.categoryId !== undefined ? { categoryId: dto.categoryId } : {}),
          ...(dto.subcategoryId !== undefined ? { subcategoryId: dto.subcategoryId } : {}),
          ...(dto.examTag !== undefined
            ? { examTag: dto.examTag?.trim() || null }
            : {}),
          ...(dto.isDaily !== undefined ? { isDaily: dto.isDaily } : {}),
        },
        include: {
          category: { select: { id: true, name: true } },
          subcategory: { select: { id: true, name: true } },
          _count: { select: { items: true, attempts: true } },
        },
      });
    });
  }

  async adminPublish(id: string) {
    const set = await this.prisma.practiceSet.findUnique({
      where: { id },
      include: { _count: { select: { items: true } } },
    });
    if (!set) {
      throw new NotFoundException(
        createErrorResponse('PRACTICE_SET_NOT_FOUND', 'Practice set not found', newRequestId()),
      );
    }
    if (set._count.items < 1) {
      throw new BadRequestException(
        createErrorResponse(
          'PRACTICE_SET_EMPTY',
          'Publish requires at least one question',
          newRequestId(),
        ),
      );
    }
    return this.prisma.practiceSet.update({
      where: { id },
      data: {
        status: PracticeSetStatus.PUBLISHED,
        publishedAt: set.publishedAt ?? new Date(),
      },
    });
  }

  async adminArchive(id: string) {
    const set = await this.prisma.practiceSet.findUnique({ where: { id } });
    if (!set) {
      throw new NotFoundException(
        createErrorResponse('PRACTICE_SET_NOT_FOUND', 'Practice set not found', newRequestId()),
      );
    }
    return this.prisma.practiceSet.update({
      where: { id },
      data: { status: PracticeSetStatus.ARCHIVED },
    });
  }

  async adminListAttempts(params: {
    cursor?: string;
    limit?: number;
    userId?: string;
    practiceSetId?: string;
    categoryId?: string;
    status?: string;
    minPercent?: number;
    maxPercent?: number;
  }) {
    const limit = Math.min(params.limit ?? 20, 100);
    const statusFilter =
      params.status === 'SUBMITTED' || params.status === 'EXPIRED' || params.status === 'IN_PROGRESS'
        ? (params.status as PracticeAttemptStatus)
        : undefined;

    const where: Prisma.PracticeAttemptWhereInput = {
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.practiceSetId ? { practiceSetId: params.practiceSetId } : {}),
      ...(statusFilter
        ? { status: statusFilter }
        : {
            status: {
              in: [PracticeAttemptStatus.SUBMITTED, PracticeAttemptStatus.EXPIRED],
            },
          }),
      ...(params.categoryId
        ? { practiceSet: { categoryId: params.categoryId } }
        : {}),
      ...(params.minPercent != null || params.maxPercent != null
        ? {
            percentScore: {
              ...(params.minPercent != null ? { gte: params.minPercent } : {}),
              ...(params.maxPercent != null ? { lte: params.maxPercent } : {}),
            },
          }
        : {}),
    };

    const items = await this.prisma.practiceAttempt.findMany({
      where,
      take: limit + 1,
      ...(params.cursor ? { cursor: { id: params.cursor }, skip: 1 } : {}),
      orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }],
      select: {
        id: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        elapsedSeconds: true,
        score: true,
        maxScore: true,
        percentScore: true,
        passed: true,
        correctCount: true,
        wrongCount: true,
        skippedCount: true,
        user: { select: { id: true, name: true, whatsappNumber: true } },
        practiceSet: {
          select: {
            id: true,
            title: true,
            slug: true,
            kind: true,
            examTag: true,
            category: { select: { id: true, name: true } },
            subcategory: { select: { id: true, name: true } },
          },
        },
      },
    });
    const nextCursor = items.length > limit ? items.pop()!.id : null;
    return {
      items: items.map((a) => ({
        ...this.mapAttemptSummary(a),
        user: a.user,
      })),
      nextCursor,
    };
  }

  private async autoFinalizeIfExpired(userId: string, practiceSetId: string) {
    const active = await this.prisma.practiceAttempt.findFirst({
      where: {
        userId,
        practiceSetId,
        status: PracticeAttemptStatus.IN_PROGRESS,
      },
      include: {
        practiceSet: { select: { durationSeconds: true } },
        answers: {
          select: { questionId: true, selectedOptionId: true },
        },
      },
      orderBy: { startedAt: 'desc' },
    });
    if (!active) return;
    if (!this.isTimedOut(active.startedAt, active.practiceSet.durationSeconds)) return;

    // Server-side auto-submit with saved progress only (no client answers).
    await this.submitAttempt(
      { userId, role: 'USER' } as RequestUser,
      active.id,
      {
        answers: active.answers.map((a) => ({
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId,
        })),
      },
    );
  }

  private async findPublishedSet(idOrSlug: string) {
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idOrSlug,
      );
    const set = await this.prisma.practiceSet.findFirst({
      where: {
        status: PracticeSetStatus.PUBLISHED,
        ...(isUuid ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }] } : { slug: idOrSlug }),
      },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        subcategory: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!set) {
      throw new NotFoundException(
        createErrorResponse('PRACTICE_SET_NOT_FOUND', 'Practice set not found', newRequestId()),
      );
    }
    return set;
  }

  private async findActiveAttempt(userId: string, practiceSetId: string) {
    const attempt = await this.prisma.practiceAttempt.findFirst({
      where: {
        userId,
        practiceSetId,
        status: PracticeAttemptStatus.IN_PROGRESS,
      },
      orderBy: { startedAt: 'desc' },
      select: {
        id: true,
        practiceSetId: true,
        status: true,
        startedAt: true,
        maxScore: true,
        answers: {
          where: { selectedOptionId: { not: null } },
          select: { questionId: true, selectedOptionId: true },
        },
      },
    });
    if (!attempt) return null;

    const set = await this.prisma.practiceSet.findUnique({
      where: { id: practiceSetId },
      select: { durationSeconds: true },
    });
    return this.mapActiveAttempt(attempt, set?.durationSeconds ?? null, attempt.answers);
  }

  private mapActiveAttempt(
    attempt: {
      id: string;
      practiceSetId: string;
      status: PracticeAttemptStatus;
      startedAt: Date;
      maxScore: number | null;
    },
    durationSeconds: number | null | undefined,
    answers: Array<{ questionId: string; selectedOptionId: string | null }>,
  ) {
    return {
      id: attempt.id,
      practiceSetId: attempt.practiceSetId,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      maxScore: attempt.maxScore,
      durationSeconds: durationSeconds ?? null,
      expiresAt: this.expiresAtIso(attempt.startedAt, durationSeconds),
      savedAnswers: answers
        .filter((a) => a.selectedOptionId)
        .map((a) => ({
          questionId: a.questionId,
          selectedOptionId: a.selectedOptionId!,
        })),
      serverNow: new Date().toISOString(),
    };
  }

  private mapAttemptSummary(a: {
    id: string;
    status: PracticeAttemptStatus;
    startedAt: Date;
    submittedAt: Date | null;
    elapsedSeconds?: number | null;
    score: number | null;
    maxScore: number | null;
    percentScore?: number | null;
    passed?: boolean | null;
    correctCount: number | null;
    wrongCount: number | null;
    skippedCount: number | null;
    practiceSet: {
      id: string;
      title: string;
      slug: string;
      kind: PracticeSetKind;
      examTag: string | null;
      category?: { id: string; name: string } | null;
      subcategory?: { id: string; name: string } | null;
    };
  }) {
    const percentScore =
      a.percentScore ??
      (a.maxScore && a.maxScore > 0 && a.score != null
        ? Math.round((Math.max(0, a.score) / a.maxScore) * 1000) / 10
        : null);
    return {
      id: a.id,
      status: a.status,
      startedAt: a.startedAt.toISOString(),
      submittedAt: a.submittedAt?.toISOString() ?? null,
      elapsedSeconds: a.elapsedSeconds ?? null,
      score: a.score,
      maxScore: a.maxScore,
      percentScore,
      passed: a.passed ?? null,
      correctCount: a.correctCount,
      wrongCount: a.wrongCount,
      skippedCount: a.skippedCount,
      totalQuestions:
        (a.correctCount ?? 0) + (a.wrongCount ?? 0) + (a.skippedCount ?? 0),
      practiceSet: a.practiceSet,
    };
  }

  private isTimedOut(startedAt: Date, durationSeconds: number | null | undefined): boolean {
    if (durationSeconds == null) return false;
    return Date.now() > startedAt.getTime() + durationSeconds * 1000;
  }

  private expiresAtIso(
    startedAt: Date,
    durationSeconds: number | null | undefined,
  ): string | null {
    if (durationSeconds == null) return null;
    return new Date(startedAt.getTime() + durationSeconds * 1000).toISOString();
  }

  private computeElapsedSeconds(
    startedAt: Date,
    endedAt: Date,
    durationSeconds: number | null | undefined,
  ): number {
    const raw = Math.max(0, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1000));
    if (durationSeconds != null) return Math.min(raw, durationSeconds);
    return raw;
  }

  private async assertQuestionsExist(questionIds: string[]) {
    const count = await this.prisma.question.count({
      where: {
        id: { in: questionIds },
        deletedAt: null,
        status: QuestionStatus.PUBLISHED,
      },
    });
    if (count !== questionIds.length) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_QUESTIONS',
          'All questions must exist and be published',
          newRequestId(),
        ),
      );
    }
  }

  private parseKind(kind?: string): PracticeSetKind | undefined {
    if (!kind) return undefined;
    if (!KIND_VALUES.has(kind)) {
      throw new BadRequestException(
        createErrorResponse('INVALID_KIND', 'Invalid practice set kind', newRequestId()),
      );
    }
    return kind as PracticeSetKind;
  }

  private requireKind(kind: string): PracticeSetKind {
    const parsed = this.parseKind(kind);
    if (!parsed) {
      throw new BadRequestException(
        createErrorResponse('INVALID_KIND', 'Invalid practice set kind', newRequestId()),
      );
    }
    return parsed;
  }
}
