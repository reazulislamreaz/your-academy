import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ExamAttemptStatus, QuestionKind, QuestionStatus, UserRole } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import type { RequestUser } from '../auth/auth.types';
import { newRequestId } from '../common/request-id';
import { PrismaService } from '../database/prisma.service';
import { AccessControlService } from '../subscriptions/access-control.service';
import type { AnswerAttemptDto } from './dto/answer-attempt.dto';
import type { CreateExamPaperDto, UpdateExamPaperDto } from './dto/create-exam-paper.dto';

/** Public metadata shape — never carries question content. */
const paperMetaSelect = {
  id: true,
  title: true,
  slug: true,
  examBody: true,
  year: true,
  description: true,
  durationMinutes: true,
  totalMarks: true,
  isPublished: true,
  publishedAt: true,
} as const;

/** List shape shared with the questions list (no answers, no content). */
const paperQuestionSelect = {
  id: true,
  title: true,
  difficulty: true,
  kind: true,
  publishedAt: true,
  category: { select: { id: true, name: true, slug: true } },
  subcategory: { select: { id: true, name: true, slug: true } },
} as const;

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 200);
}

@Injectable()
export class ExamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessControlService,
  ) {}

  // ─── Public / learner paper reads ──────────────────────────────────────────

  async listPapers() {
    const papers = await this.prisma.examPaper.findMany({
      where: { isPublished: true },
      orderBy: [{ examBody: 'asc' }, { publishedAt: 'desc' }, { title: 'asc' }],
      select: { ...paperMetaSelect, _count: { select: { questions: true } } },
    });
    return papers.map((p) => {
      const { _count, ...rest } = p;
      return { ...rest, questionCount: _count.questions };
    });
  }

  async getPaperBySlug(slug: string) {
    const paper = await this.prisma.examPaper.findFirst({
      where: { slug, isPublished: true },
      select: {
        ...paperMetaSelect,
        questions: {
          where: { question: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
          orderBy: { sortOrder: 'asc' },
          include: { question: { select: paperQuestionSelect } },
        },
      },
    });
    if (!paper) {
      throw new NotFoundException(
        createErrorResponse('EXAM_PAPER_NOT_FOUND', 'Exam paper not found', newRequestId()),
      );
    }
    const { questions, ...meta } = paper;
    return {
      ...meta,
      questionCount: questions.length,
      questions: questions.map((row) => row.question),
    };
  }

  // ─── Admin paper CRUD ──────────────────────────────────────────────────────

  async adminList() {
    const papers = await this.prisma.examPaper.findMany({
      orderBy: [{ updatedAt: 'desc' }],
      select: { ...paperMetaSelect, _count: { select: { questions: true } } },
    });
    return papers.map((p) => {
      const { _count, ...rest } = p;
      return { ...rest, questionCount: _count.questions };
    });
  }

  async adminGet(id: string) {
    const paper = await this.prisma.examPaper.findUnique({
      where: { id },
      select: {
        ...paperMetaSelect,
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            question: {
              select: {
                id: true,
                title: true,
                kind: true,
                difficulty: true,
                status: true,
                category: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });
    if (!paper) {
      throw new NotFoundException(
        createErrorResponse('EXAM_PAPER_NOT_FOUND', 'Exam paper not found', newRequestId()),
      );
    }
    const { questions, ...meta } = paper;
    return {
      ...meta,
      questionCount: questions.length,
      questions: questions.map((row) => ({ ...row.question, sortOrder: row.sortOrder })),
    };
  }

  async create(user: RequestUser, dto: CreateExamPaperDto) {
    const slug = dto.slug ?? slugify(dto.title);
    if (!slug) {
      throw new BadRequestException(
        createErrorResponse('VALIDATION_ERROR', 'Could not derive a slug from the title', newRequestId()),
      );
    }
    const clash = await this.prisma.examPaper.findUnique({ where: { slug }, select: { id: true } });
    if (clash) {
      throw new ConflictException(
        createErrorResponse('SLUG_TAKEN', 'An exam paper with this slug already exists', newRequestId()),
      );
    }
    return this.prisma.examPaper.create({
      data: {
        title: dto.title.trim(),
        slug,
        examBody: dto.examBody.trim(),
        year: dto.year,
        description: dto.description,
        durationMinutes: dto.durationMinutes,
        totalMarks: dto.totalMarks,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
        createdById: user.userId,
      },
    });
  }

  async update(id: string, dto: UpdateExamPaperDto) {
    const existing = await this.prisma.examPaper.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('EXAM_PAPER_NOT_FOUND', 'Exam paper not found', newRequestId()),
      );
    }
    if (dto.slug && dto.slug !== existing.slug) {
      const clash = await this.prisma.examPaper.findUnique({
        where: { slug: dto.slug },
        select: { id: true },
      });
      if (clash) {
        throw new ConflictException(
          createErrorResponse('SLUG_TAKEN', 'An exam paper with this slug already exists', newRequestId()),
        );
      }
    }
    return this.prisma.examPaper.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title.trim() } : {}),
        ...(dto.slug ? { slug: dto.slug } : {}),
        ...(dto.examBody ? { examBody: dto.examBody.trim() } : {}),
        ...(dto.year !== undefined ? { year: dto.year } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.durationMinutes !== undefined ? { durationMinutes: dto.durationMinutes } : {}),
        ...(dto.totalMarks !== undefined ? { totalMarks: dto.totalMarks } : {}),
        ...(dto.isPublished !== undefined ? { isPublished: dto.isPublished } : {}),
        ...(dto.isPublished === true && !existing.publishedAt ? { publishedAt: new Date() } : {}),
      },
    });
  }

  async remove(id: string) {
    const existing = await this.prisma.examPaper.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      throw new NotFoundException(
        createErrorResponse('EXAM_PAPER_NOT_FOUND', 'Exam paper not found', newRequestId()),
      );
    }
    await this.prisma.examPaper.delete({ where: { id } });
    return { id };
  }

  async attachQuestions(id: string, questionIds: string[]) {
    const paper = await this.prisma.examPaper.findUnique({ where: { id }, select: { id: true } });
    if (!paper) {
      throw new NotFoundException(
        createErrorResponse('EXAM_PAPER_NOT_FOUND', 'Exam paper not found', newRequestId()),
      );
    }
    const found = await this.prisma.question.findMany({
      where: { id: { in: questionIds }, status: QuestionStatus.PUBLISHED, deletedAt: null },
      select: { id: true },
    });
    if (found.length !== questionIds.length) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_QUESTIONS',
          'All attached questions must exist and be published',
          newRequestId(),
        ),
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.examPaperQuestion.deleteMany({ where: { paperId: id } });
      if (questionIds.length > 0) {
        await tx.examPaperQuestion.createMany({
          data: questionIds.map((questionId, sortOrder) => ({ paperId: id, questionId, sortOrder })),
        });
      }
    });
    return this.adminGet(id);
  }

  async detachQuestion(id: string, questionId: string) {
    await this.prisma.examPaperQuestion.deleteMany({ where: { paperId: id, questionId } });
    return this.adminGet(id);
  }

  // ─── Timed model tests ─────────────────────────────────────────────────────

  async startAttempt(user: RequestUser, paperId: string) {
    const paper = await this.prisma.examPaper.findFirst({
      where: { id: paperId, isPublished: true },
      select: {
        ...paperMetaSelect,
        questions: {
          where: { question: { status: QuestionStatus.PUBLISHED, deletedAt: null } },
          orderBy: { sortOrder: 'asc' },
          include: {
            question: {
              select: {
                id: true,
                title: true,
                content: true,
                kind: true,
                difficulty: true,
                category: { select: { id: true, name: true, slug: true } },
                subcategory: { select: { id: true, name: true, slug: true } },
                // Options WITHOUT isCorrect — correctness is never sent pre-submit.
                options: {
                  orderBy: { sortOrder: 'asc' },
                  select: { id: true, label: true, content: true, sortOrder: true },
                },
              },
            },
          },
        },
      },
    });
    if (!paper) {
      throw new NotFoundException(
        createErrorResponse('EXAM_PAPER_NOT_FOUND', 'Exam paper not found', newRequestId()),
      );
    }
    const { questions, ...meta } = paper;
    const items = questions.map((row) => row.question);
    if (items.length === 0) {
      throw new BadRequestException(
        createErrorResponse('EMPTY_EXAM_PAPER', 'This exam paper has no published questions yet', newRequestId()),
      );
    }
    const attempt = await this.prisma.examAttempt.create({
      data: {
        userId: user.userId,
        examPaperId: paper.id,
        status: ExamAttemptStatus.IN_PROGRESS,
        totalCount: items.length,
      },
    });
    return {
      attemptId: attempt.id,
      startedAt: attempt.startedAt.toISOString(),
      durationMinutes: meta.durationMinutes,
      totalCount: items.length,
      examPaper: { ...meta, questionCount: items.length },
      questions: items,
    };
  }

  async answerAttempt(user: RequestUser, attemptId: string, dto: AnswerAttemptDto) {
    const attempt = await this.assertOwnedAttempt(user, attemptId);
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) {
      throw new BadRequestException(
        createErrorResponse('ATTEMPT_CLOSED', 'This attempt is already closed', newRequestId()),
      );
    }
    await this.expireIfNeeded(attempt);

    const link = await this.prisma.examPaperQuestion.findFirst({
      where: { paperId: attempt.examPaperId, questionId: dto.questionId },
      include: { question: { select: { id: true, kind: true } } },
    });
    if (!link) {
      throw new NotFoundException(
        createErrorResponse('QUESTION_NOT_IN_PAPER', 'Question is not part of this exam paper', newRequestId()),
      );
    }
    if (link.question.kind === QuestionKind.WRITTEN) {
      throw new BadRequestException(
        createErrorResponse(
          'WRITTEN_QUESTION',
          'Written questions cannot be answered with an option in a timed exam',
          newRequestId(),
        ),
      );
    }
    let isCorrect = false;
    if (dto.selectedOptionId) {
      const option = await this.prisma.questionOption.findFirst({
        where: { id: dto.selectedOptionId, questionId: dto.questionId },
        select: { id: true, isCorrect: true },
      });
      if (!option) {
        throw new NotFoundException(
          createErrorResponse('OPTION_NOT_FOUND', 'Option not found for this question', newRequestId()),
        );
      }
      isCorrect = option.isCorrect;
    }

    const existing = await this.prisma.questionAttempt.findFirst({
      where: { examAttemptId: attempt.id, questionId: dto.questionId },
      select: { id: true },
    });
    if (existing) {
      await this.prisma.questionAttempt.update({
        where: { id: existing.id },
        data: { selectedOptionId: dto.selectedOptionId ?? null, isCorrect },
      });
    } else {
      await this.prisma.questionAttempt.create({
        data: {
          userId: user.userId,
          questionId: dto.questionId,
          selectedOptionId: dto.selectedOptionId ?? null,
          isCorrect,
          examAttemptId: attempt.id,
        },
      });
    }
    // No correctness in the response — the learner only learns it at review.
    return { attemptId: attempt.id, questionId: dto.questionId, answered: true };
  }

  async submitAttempt(user: RequestUser, attemptId: string) {
    const attempt = await this.assertOwnedAttempt(user, attemptId);
    if (attempt.status === ExamAttemptStatus.SUBMITTED) {
      return this.summarize(attempt);
    }
    const counts = await this.computeCounts(attempt);
    const status =
      attempt.status === ExamAttemptStatus.EXPIRED || (await this.isPastDeadline(attempt))
        ? ExamAttemptStatus.EXPIRED
        : ExamAttemptStatus.SUBMITTED;
    const updated = await this.prisma.examAttempt.update({
      where: { id: attempt.id },
      data: {
        status,
        submittedAt: new Date(),
        correctCount: counts.correct,
        wrongCount: counts.wrong,
        unansweredCount: counts.unanswered,
      },
      include: { examPaper: { select: paperMetaSelect } },
    });
    return this.summarize(updated);
  }

  async myAttempts(user: RequestUser) {
    const attempts = await this.prisma.examAttempt.findMany({
      where: { userId: user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        examPaper: {
          select: {
            id: true,
            title: true,
            slug: true,
            examBody: true,
            year: true,
            durationMinutes: true,
            totalMarks: true,
          },
        },
      },
    });
    return attempts.map((a) => this.summarize(a));
  }

  async getAttempt(user: RequestUser, attemptId: string) {
    const attempt = await this.assertOwnedAttempt(user, attemptId, true);
    await this.expireIfNeeded(attempt);
    const fresh = await this.prisma.examAttempt.findUnique({
      where: { id: attempt.id },
      include: { examPaper: { select: paperMetaSelect } },
    });
    if (!fresh) {
      throw new NotFoundException(
        createErrorResponse('EXAM_ATTEMPT_NOT_FOUND', 'Exam attempt not found', newRequestId()),
      );
    }
    const dbUser = await this.prisma.user.findUniqueOrThrow({ where: { id: user.userId } });
    const canView = await this.access.canViewAnswers(dbUser);
    // Keys stay hidden while the exam is running — even for entitled users —
    // otherwise the timed test would be trivially cheatable via the API.
    const showKeys = canView && fresh.status !== ExamAttemptStatus.IN_PROGRESS;

    const answers = await this.prisma.questionAttempt.findMany({
      where: { examAttemptId: fresh.id },
      select: { questionId: true, selectedOptionId: true, isCorrect: true },
    });
    const byQuestion = new Map(answers.map((a) => [a.questionId, a]));

    // Review follows paper order and includes unanswered questions too.
    const links = await this.prisma.examPaperQuestion.findMany({
      where: { paperId: fresh.examPaperId },
      orderBy: { sortOrder: 'asc' },
      include: {
        question: {
          select: {
            id: true,
            title: true,
            content: true,
            kind: true,
            difficulty: true,
            category: { select: { id: true, name: true, slug: true } },
            subcategory: { select: { id: true, name: true, slug: true } },
            explanation: true,
            modelAnswer: true,
            options: {
              orderBy: { sortOrder: 'asc' },
              select: { id: true, label: true, content: true, isCorrect: true, sortOrder: true },
            },
          },
        },
      },
    });
    const questions = links.map(({ question: q }) => {
      const a = byQuestion.get(q.id);
      const options = q.options.map((o) => this.access.stripAnswerFields(o, showKeys));
      return {
        id: q.id,
        title: q.title,
        content: q.content,
        kind: q.kind,
        difficulty: q.difficulty,
        category: q.category,
        subcategory: q.subcategory,
        options,
        explanation: showKeys ? (q.explanation ?? undefined) : undefined,
        modelAnswer: showKeys ? (q.modelAnswer ?? undefined) : undefined,
        selectedOptionId: a?.selectedOptionId ?? null,
        // Per-question correctness is restricted content: absent when not entitled.
        ...(showKeys && a ? { isCorrect: a.isCorrect } : {}),
      };
    });

    const counts =
      fresh.status === ExamAttemptStatus.IN_PROGRESS
        ? await this.computeCounts(fresh)
        : {
            correct: fresh.correctCount,
            wrong: fresh.wrongCount,
            unanswered: fresh.unansweredCount,
          };
    return {
      ...this.summarize(fresh, counts),
      answersVisible: canView,
      questions,
    };
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async assertOwnedAttempt(user: RequestUser, attemptId: string, allowAdmin = false) {
    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: { examPaper: { select: paperMetaSelect } },
    });
    if (!attempt) {
      throw new NotFoundException(
        createErrorResponse('EXAM_ATTEMPT_NOT_FOUND', 'Exam attempt not found', newRequestId()),
      );
    }
    const isOwner = attempt.userId === user.userId;
    const isAdmin = allowAdmin && user.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException(
        createErrorResponse('FORBIDDEN', 'You do not own this exam attempt', newRequestId()),
      );
    }
    return attempt;
  }

  private async isPastDeadline(attempt: {
    startedAt: Date;
    examPaper: { durationMinutes: number };
  }): Promise<boolean> {
    return Date.now() > attempt.startedAt.getTime() + attempt.examPaper.durationMinutes * 60_000;
  }

  /** Flip an in-progress attempt to EXPIRED once its timer has run out. */
  private async expireIfNeeded(attempt: {
    id: string;
    status: ExamAttemptStatus;
    startedAt: Date;
    examPaper: { durationMinutes: number };
  }) {
    if (attempt.status !== ExamAttemptStatus.IN_PROGRESS) return;
    if (!(await this.isPastDeadline(attempt))) return;
    await this.prisma.examAttempt.update({
      where: { id: attempt.id },
      data: { status: ExamAttemptStatus.EXPIRED },
    });
    throw new GoneException(
      createErrorResponse('EXAM_EXPIRED', 'The exam time has run out', newRequestId()),
    );
  }

  private async computeCounts(attempt: { id: string; totalCount: number }) {
    const answers = await this.prisma.questionAttempt.findMany({
      where: { examAttemptId: attempt.id },
      select: { isCorrect: true },
    });
    const correct = answers.filter((a) => a.isCorrect).length;
    const wrong = answers.length - correct;
    return { correct, wrong, unanswered: attempt.totalCount - answers.length };
  }

  private summarize(
    attempt: {
      id: string;
      status: ExamAttemptStatus;
      startedAt: Date;
      submittedAt: Date | null;
      correctCount: number;
      wrongCount: number;
      unansweredCount: number;
      totalCount: number;
      examPaper: {
        id: string;
        title: string;
        slug: string;
        examBody: string;
        year: number | null;
        durationMinutes: number;
        totalMarks: number | null;
      };
    },
    counts?: { correct: number; wrong: number; unanswered: number },
  ) {
    return {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      correctCount: counts?.correct ?? attempt.correctCount,
      wrongCount: counts?.wrong ?? attempt.wrongCount,
      unansweredCount: counts?.unanswered ?? attempt.unansweredCount,
      totalCount: attempt.totalCount,
      examPaper: attempt.examPaper,
    };
  }
}
