import { ForbiddenException } from '@nestjs/common';
import { ExamAttemptStatus, QuestionKind, UserRole } from '@prisma/client';
import { ExamsService } from '../exams.service';

describe('ExamsService attempt privacy and ownership', () => {
  const prisma = {
    examAttempt: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    questionAttempt: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    examPaperQuestion: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    questionOption: {
      findFirst: jest.fn(),
    },
    user: {
      findUniqueOrThrow: jest.fn(),
    },
  };

  function stripAnswerFields<T extends { isCorrect?: boolean; explanation?: string | null }>(
    question: T,
    canView: boolean,
  ): T {
    if (canView) return question;
    const clone = { ...question };
    delete clone.isCorrect;
    delete clone.explanation;
    return clone;
  }

  const access = {
    canViewAnswers: jest.fn(),
    stripAnswerFields: jest.fn(stripAnswerFields),
  };
  const service = new ExamsService(prisma as never, access as never);

  const owner = { userId: 'u1', role: UserRole.USER, sessionId: 's1' };
  const other = { userId: 'u2', role: UserRole.USER, sessionId: 's2' };
  const paperMeta = {
    id: 'p1',
    title: 'BCS 45th Preliminary',
    slug: 'bcs-45th-preliminary',
    examBody: 'BCS',
    year: 2023,
    durationMinutes: 60,
    totalMarks: 100,
  };

  const submittedAttempt = {
    id: 'a1',
    userId: 'u1',
    examPaperId: 'p1',
    status: ExamAttemptStatus.SUBMITTED,
    startedAt: new Date(Date.now() - 3_600_000),
    submittedAt: new Date(),
    correctCount: 1,
    wrongCount: 0,
    unansweredCount: 0,
    totalCount: 1,
    examPaper: paperMeta,
  };

  const paperQuestion = {
    id: 'q1',
    title: 'Sample question',
    content: 'Stem',
    kind: QuestionKind.MCQ,
    difficulty: 'EASY',
    category: { id: 'c1', name: 'Cat', slug: 'cat' },
    subcategory: null,
    explanation: 'Because A',
    modelAnswer: null,
    options: [
      { id: 'o1', label: 'A', content: 'Alpha', isCorrect: true, sortOrder: 0 },
      { id: 'o2', label: 'B', content: 'Beta', isCorrect: false, sortOrder: 1 },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    access.stripAnswerFields.mockImplementation(stripAnswerFields);
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1' });
    prisma.examPaperQuestion.findMany.mockResolvedValue([{ question: paperQuestion }]);
    prisma.questionAttempt.findMany.mockResolvedValue([
      { questionId: 'q1', selectedOptionId: 'o1', isCorrect: true },
    ]);
  });

  it('hides per-question correctness (and keys) from a non-entitled owner, but keeps the summary', async () => {
    access.canViewAnswers.mockResolvedValue(false);
    prisma.examAttempt.findUnique.mockResolvedValue(submittedAttempt);
    const result = await service.getAttempt(owner as never, 'a1');
    // DEC-022: the summary stays visible to the owner.
    expect(result.correctCount).toBe(1);
    expect(result.totalCount).toBe(1);
    expect(result.answersVisible).toBe(false);
    expect(result.questions).toHaveLength(1);
    expect('isCorrect' in result.questions[0]).toBe(false);
    expect(result.questions[0].selectedOptionId).toBe('o1');
    expect('isCorrect' in result.questions[0].options[0]).toBe(false);
    expect(result.questions[0].explanation).toBeUndefined();
  });

  it('shows per-question correctness to an entitled owner', async () => {
    access.canViewAnswers.mockResolvedValue(true);
    prisma.examAttempt.findUnique.mockResolvedValue(submittedAttempt);
    const result = await service.getAttempt(owner as never, 'a1');
    expect(result.answersVisible).toBe(true);
    expect(result.questions[0].isCorrect).toBe(true);
    expect(result.questions[0].options[0]).toMatchObject({ isCorrect: true });
    expect(result.questions[0].explanation).toBe('Because A');
  });

  it('hides keys while the attempt is still in progress, even when entitled', async () => {
    access.canViewAnswers.mockResolvedValue(true);
    prisma.examAttempt.findUnique.mockResolvedValue({
      ...submittedAttempt,
      status: ExamAttemptStatus.IN_PROGRESS,
      submittedAt: null,
      startedAt: new Date(),
    });
    const result = await service.getAttempt(owner as never, 'a1');
    expect('isCorrect' in result.questions[0]).toBe(false);
    expect('isCorrect' in result.questions[0].options[0]).toBe(false);
    expect(result.questions[0].explanation).toBeUndefined();
    // The learner's own selection is still visible.
    expect(result.questions[0].selectedOptionId).toBe('o1');
  });

  it('forbids another user from viewing an attempt (403)', async () => {
    prisma.examAttempt.findUnique.mockResolvedValue(submittedAttempt);
    await expect(service.getAttempt(other as never, 'a1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('computes correct/wrong/unanswered on submit', async () => {
    const inProgress = {
      ...submittedAttempt,
      status: ExamAttemptStatus.IN_PROGRESS,
      submittedAt: null,
      correctCount: 0,
      wrongCount: 0,
      unansweredCount: 0,
      totalCount: 3,
      startedAt: new Date(),
    };
    prisma.examAttempt.findUnique.mockResolvedValue(inProgress);
    prisma.questionAttempt.findMany.mockResolvedValue([
      { isCorrect: true },
      { isCorrect: false },
    ]);
    prisma.examAttempt.update.mockResolvedValue({
      ...inProgress,
      status: ExamAttemptStatus.SUBMITTED,
      submittedAt: new Date(),
      correctCount: 1,
      wrongCount: 1,
      unansweredCount: 1,
    });
    const result = await service.submitAttempt(owner as never, 'a1');
    expect(result.correctCount).toBe(1);
    expect(result.wrongCount).toBe(1);
    expect(result.unansweredCount).toBe(1);
    expect(prisma.examAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: ExamAttemptStatus.SUBMITTED,
          correctCount: 1,
          wrongCount: 1,
          unansweredCount: 1,
        }),
      }),
    );
  });

  it('answer endpoint records server-computed correctness but returns none to the client', async () => {
    const inProgress = {
      ...submittedAttempt,
      status: ExamAttemptStatus.IN_PROGRESS,
      startedAt: new Date(),
      totalCount: 1,
    };
    prisma.examAttempt.findUnique.mockResolvedValue(inProgress);
    prisma.examPaperQuestion.findFirst.mockResolvedValue({
      question: { id: 'q1', kind: QuestionKind.MCQ },
    });
    prisma.questionOption.findFirst.mockResolvedValue({ id: 'o1', isCorrect: true });
    prisma.questionAttempt.findFirst.mockResolvedValue(null);
    prisma.questionAttempt.create.mockResolvedValue({ id: 'qa1' });

    const result = await service.answerAttempt(owner as never, 'a1', {
      questionId: 'q1',
      selectedOptionId: 'o1',
    });
    expect(result).toEqual({ attemptId: 'a1', questionId: 'q1', answered: true });
    expect('isCorrect' in result).toBe(false);
    expect('correct' in result).toBe(false);
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isCorrect: true, examAttemptId: 'a1' }),
    });
  });
});
