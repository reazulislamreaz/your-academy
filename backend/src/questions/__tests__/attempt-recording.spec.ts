import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionKind } from '@prisma/client';
import { QuestionsService } from '../questions.service';

describe('QuestionsService practice attempt recording', () => {
  const prisma = {
    question: {
      findFirst: jest.fn(),
    },
    questionOption: {
      findFirst: jest.fn(),
    },
    questionAttempt: {
      create: jest.fn(),
    },
    user: {
      findUniqueOrThrow: jest.fn(),
    },
  };
  const access = { canViewAnswers: jest.fn() };
  const audit = { record: jest.fn() };
  const service = new QuestionsService(prisma as never, access as never, audit as never);

  const user = { userId: 'u1', role: 'USER', sessionId: 's1' };
  const dbUser = { id: 'u1' };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.question.findFirst.mockResolvedValue({ id: 'q1', kind: QuestionKind.MCQ });
    prisma.questionOption.findFirst.mockResolvedValue({ id: 'o1', isCorrect: true });
    prisma.questionAttempt.create.mockResolvedValue({ id: 'a1' });
    prisma.user.findUniqueOrThrow.mockResolvedValue(dbUser);
  });

  it('returns correct=null for a non-entitled user (no leak) but still records', async () => {
    access.canViewAnswers.mockResolvedValue(false);
    const result = await service.recordAttempt(user as never, 'q1', 'o1');
    expect(result).toEqual({ correct: null, questionId: 'q1', selectedOptionId: 'o1' });
    expect(prisma.questionAttempt.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: 'u1', questionId: 'q1', isCorrect: true }),
    });
  });

  it('returns the real boolean for an entitled user', async () => {
    access.canViewAnswers.mockResolvedValue(true);
    const result = await service.recordAttempt(user as never, 'q1', 'o1');
    expect(result.correct).toBe(true);
  });

  it('returns false (not null) for an entitled user who picked wrong', async () => {
    access.canViewAnswers.mockResolvedValue(true);
    prisma.questionOption.findFirst.mockResolvedValue({ id: 'o2', isCorrect: false });
    const result = await service.recordAttempt(user as never, 'q1', 'o2');
    expect(result.correct).toBe(false);
  });

  it('rejects attempts on written questions', async () => {
    prisma.question.findFirst.mockResolvedValue({ id: 'q1', kind: QuestionKind.WRITTEN });
    await expect(service.recordAttempt(user as never, 'q1', 'o1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an option that belongs to another question', async () => {
    prisma.questionOption.findFirst.mockResolvedValue(null);
    await expect(service.recordAttempt(user as never, 'q1', 'oX')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.questionAttempt.create).not.toHaveBeenCalled();
  });
});
