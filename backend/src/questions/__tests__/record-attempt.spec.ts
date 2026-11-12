import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionStatus } from '@prisma/client';
import { QuestionsService } from '../questions.service';

describe('QuestionsService.recordAttempt', () => {
  const user = { userId: 'user-1', role: 'USER' as const, sessionId: 'sess-1' };

  function buildService(prisma: Record<string, unknown>, access: Record<string, unknown>) {
    return new QuestionsService(
      prisma as never,
      access as never,
      { record: jest.fn() } as never,
      { record: jest.fn() } as never,
    );
  }

  it('stores server-computed correctness and omits isCorrect when not entitled', async () => {
    const prisma = {
      question: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'q1',
          categoryId: 'cat1',
        }),
      },
      questionOption: {
        findFirst: jest.fn().mockResolvedValue({ id: 'opt1', isCorrect: true }),
      },
      questionAttempt: {
        create: jest.fn().mockResolvedValue({
          id: 'att1',
          questionId: 'q1',
          selectedOptionId: 'opt1',
          isCorrect: true,
          createdAt: new Date('2026-11-11T00:00:00.000Z'),
        }),
      },
      user: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'user-1' }),
      },
    };
    const access = {
      canViewAnswers: jest.fn().mockResolvedValue(false),
    };
    const service = buildService(prisma, access);

    const result = await service.recordAttempt(user, 'q1', 'opt1');

    expect(prisma.questionAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          questionId: 'q1',
          selectedOptionId: 'opt1',
          isCorrect: true,
          categoryId: 'cat1',
        }),
      }),
    );
    expect(result).toEqual({
      id: 'att1',
      questionId: 'q1',
      selectedOptionId: 'opt1',
      createdAt: '2026-11-11T00:00:00.000Z',
    });
    expect(result).not.toHaveProperty('isCorrect');
  });

  it('rejects options that do not belong to the question', async () => {
    const prisma = {
      question: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'q1',
          categoryId: 'cat1',
          status: QuestionStatus.PUBLISHED,
        }),
      },
      questionOption: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = buildService(prisma, {});
    await expect(service.recordAttempt(user, 'q1', 'opt-x')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects missing published questions', async () => {
    const prisma = {
      question: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = buildService(prisma, {});
    await expect(service.recordAttempt(user, 'missing', 'opt1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
