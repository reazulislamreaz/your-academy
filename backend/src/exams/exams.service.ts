import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createErrorResponse } from '@your-academy/shared';
import { PrismaService } from '../database/prisma.service';
import { newRequestId } from '../common/request-id';
import { buildExamTemplateBuffer, parseExamWorkbook } from './exam-excel-parser';
import { slugifyExamTitle } from './exam-slug';
import type { SubmitExamAttemptDto } from './dto/submit-exam-attempt.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function asStringOptions(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v));
}

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async getTemplateBuffer(): Promise<Buffer> {
    return buildExamTemplateBuffer();
  }

  async listPublished() {
    const exams = await this.prisma.exam.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        totalQuestions: true,
        durationInMinutes: true,
        createdAt: true,
      },
    });
    return exams;
  }

  async getPublishedForTaking(idOrSlug: string) {
    const exam = await this.findPublished(idOrSlug);
    const questions = await this.prisma.examQuestion.findMany({
      where: { examId: exam.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        questionText: true,
        options: true,
        sortOrder: true,
      },
    });

    return {
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      description: exam.description,
      totalQuestions: exam.totalQuestions,
      durationInMinutes: exam.durationInMinutes,
      createdAt: exam.createdAt,
      questions: questions.map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: asStringOptions(q.options),
        sortOrder: q.sortOrder,
      })),
    };
  }

  async submitAttempt(idOrSlug: string, dto: SubmitExamAttemptDto) {
    const exam = await this.findPublished(idOrSlug);
    const questions = await this.prisma.examQuestion.findMany({
      where: { examId: exam.id },
      orderBy: { sortOrder: 'asc' },
    });

    if (questions.length === 0) {
      throw new BadRequestException(
        createErrorResponse('EXAM_EMPTY', 'This exam has no questions', newRequestId()),
      );
    }

    const answers = dto.userAnswers ?? {};
    let correctCount = 0;
    let wrongCount = 0;
    const normalizedAnswers: Record<string, string> = {};

    for (const q of questions) {
      const selected = typeof answers[q.id] === 'string' ? answers[q.id].trim() : '';
      normalizedAnswers[q.id] = selected;
      if (!selected) {
        wrongCount += 1;
        continue;
      }
      if (selected === q.correctAnswer) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }
    }

    const attempt = await this.prisma.examAttempt.create({
      data: {
        examId: exam.id,
        userName: dto.userName.trim(),
        score: correctCount,
        correctCount,
        wrongCount,
        userAnswers: normalizedAnswers as Prisma.InputJsonValue,
        elapsedSeconds: dto.elapsedSeconds ?? null,
        timedOut: Boolean(dto.timedOut),
      },
    });

    return {
      attemptId: attempt.id,
      examId: exam.id,
      examSlug: exam.slug,
      userName: attempt.userName,
      score: attempt.score,
      totalQuestions: exam.totalQuestions,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      percent: exam.totalQuestions
        ? Math.round((correctCount / exam.totalQuestions) * 100)
        : 0,
      timedOut: attempt.timedOut,
      submittedAt: attempt.submittedAt,
    };
  }

  async getAttemptResult(attemptId: string) {
    if (!UUID_RE.test(attemptId)) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }

    const attempt = await this.prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            slug: true,
            totalQuestions: true,
            durationInMinutes: true,
            isPublished: true,
          },
        },
      },
    });

    if (!attempt || !attempt.exam.isPublished) {
      throw new NotFoundException(
        createErrorResponse('ATTEMPT_NOT_FOUND', 'Attempt not found', newRequestId()),
      );
    }

    const questions = await this.prisma.examQuestion.findMany({
      where: { examId: attempt.examId },
      orderBy: { sortOrder: 'asc' },
    });

    const userAnswers = (attempt.userAnswers ?? {}) as Record<string, string>;

    return {
      attemptId: attempt.id,
      userName: attempt.userName,
      score: attempt.score,
      correctCount: attempt.correctCount,
      wrongCount: attempt.wrongCount,
      percent: attempt.exam.totalQuestions
        ? Math.round((attempt.correctCount / attempt.exam.totalQuestions) * 100)
        : 0,
      timedOut: attempt.timedOut,
      elapsedSeconds: attempt.elapsedSeconds,
      submittedAt: attempt.submittedAt,
      exam: {
        id: attempt.exam.id,
        title: attempt.exam.title,
        slug: attempt.exam.slug,
        totalQuestions: attempt.exam.totalQuestions,
        durationInMinutes: attempt.exam.durationInMinutes,
      },
      answerSheet: questions.map((q) => {
        const selected = userAnswers[q.id] ?? '';
        const options = asStringOptions(q.options);
        const isCorrect = Boolean(selected) && selected === q.correctAnswer;
        return {
          id: q.id,
          questionText: q.questionText,
          options,
          selectedAnswer: selected || null,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          isCorrect,
          isSkipped: !selected,
        };
      }),
    };
  }

  async createFromUpload(input: {
    title: string;
    description?: string | null;
    durationInMinutes: number;
    file: Express.Multer.File;
    createdById: string;
  }) {
    const title = input.title?.trim();
    if (!title) {
      throw new BadRequestException(
        createErrorResponse('TITLE_REQUIRED', 'Exam title is required', newRequestId()),
      );
    }
    if (!Number.isFinite(input.durationInMinutes) || input.durationInMinutes < 1) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_DURATION',
          'Duration must be at least 1 minute',
          newRequestId(),
        ),
      );
    }
    if (input.durationInMinutes > 600) {
      throw new BadRequestException(
        createErrorResponse(
          'INVALID_DURATION',
          'Duration cannot exceed 600 minutes',
          newRequestId(),
        ),
      );
    }
    if (!input.file?.buffer?.length) {
      throw new BadRequestException(
        createErrorResponse('FILE_REQUIRED', 'Excel file is required', newRequestId()),
      );
    }
    const lower = (input.file.originalname || '').toLowerCase();
    if (!lower.endsWith('.xlsx')) {
      throw new BadRequestException(
        createErrorResponse('INVALID_FILE_TYPE', 'Only .xlsx files are supported', newRequestId()),
      );
    }

    const parsed = await parseExamWorkbook(input.file.buffer);
    if (parsed.errors.length && parsed.rows.length === 0) {
      throw new BadRequestException(
        createErrorResponse('EXCEL_PARSE_FAILED', parsed.errors.join('; '), newRequestId()),
      );
    }
    if (parsed.rows.length === 0) {
      throw new BadRequestException(
        createErrorResponse('EXCEL_EMPTY', 'No valid questions found in the file', newRequestId()),
      );
    }

    const slug = await this.uniqueSlug(slugifyExamTitle(title));

    const exam = await this.prisma.$transaction(async (tx) => {
      const created = await tx.exam.create({
        data: {
          title: title.slice(0, 200),
          slug,
          description: input.description?.trim() || null,
          totalQuestions: parsed.rows.length,
          durationInMinutes: Math.floor(input.durationInMinutes),
          isPublished: true,
          createdById: input.createdById,
          questions: {
            create: parsed.rows.map((row, index) => ({
              questionText: row.questionText,
              options: row.options,
              correctAnswer: row.correctAnswer,
              explanation: row.explanation,
              sortOrder: index,
            })),
          },
        },
        include: {
          questions: {
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              questionText: true,
              options: true,
              correctAnswer: true,
              explanation: true,
              sortOrder: true,
            },
          },
        },
      });
      return created;
    });

    return {
      id: exam.id,
      title: exam.title,
      slug: exam.slug,
      description: exam.description,
      totalQuestions: exam.totalQuestions,
      durationInMinutes: exam.durationInMinutes,
      isPublished: exam.isPublished,
      createdAt: exam.createdAt,
      parseWarnings: parsed.errors,
      preview: exam.questions.slice(0, 20).map((q) => ({
        id: q.id,
        questionText: q.questionText,
        options: asStringOptions(q.options),
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sortOrder: q.sortOrder,
      })),
    };
  }

  async listAdmin(limit = 50) {
    return this.prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
      select: {
        id: true,
        title: true,
        slug: true,
        totalQuestions: true,
        durationInMinutes: true,
        isPublished: true,
        createdAt: true,
        _count: { select: { attempts: true } },
      },
    });
  }

  private async findPublished(idOrSlug: string) {
    const where = UUID_RE.test(idOrSlug)
      ? { OR: [{ id: idOrSlug }, { slug: idOrSlug }], isPublished: true }
      : { slug: idOrSlug, isPublished: true };

    const exam = await this.prisma.exam.findFirst({ where });
    if (!exam) {
      throw new NotFoundException(
        createErrorResponse('EXAM_NOT_FOUND', 'Exam not found', newRequestId()),
      );
    }
    return exam;
  }

  private async uniqueSlug(base: string): Promise<string> {
    let candidate = base.slice(0, 200);
    for (let i = 0; i < 20; i += 1) {
      const existing = await this.prisma.exam.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing) return candidate;
      candidate = `${base.slice(0, 180)}-${i + 2}`;
    }
    return `${base.slice(0, 160)}-${Date.now().toString(36)}`;
  }
}
