import { UnprocessableEntityException } from '@nestjs/common';
import { QuestionKind } from '@prisma/client';
import { QuestionsService } from '../questions.service';

describe('QuestionsService written-question validation', () => {
  const prisma = {
    category: {
      findUnique: jest.fn(),
    },
    question: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    questionOption: {
      findMany: jest.fn(),
    },
  };
  const access = {};
  const audit = { record: jest.fn() };
  const service = new QuestionsService(prisma as never, access as never, audit as never);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.category.findUnique.mockResolvedValue({ id: 'c1', parentId: null });
  });

  it('rejects publish of a WRITTEN question without a model answer', async () => {
    prisma.question.findUnique.mockResolvedValue({
      id: 'q1',
      kind: QuestionKind.WRITTEN,
      modelAnswer: null,
      options: [],
      deletedAt: null,
      publishedAt: null,
    });
    await expect(service.publish('q1')).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects publish of a WRITTEN question that still has options', async () => {
    prisma.question.findUnique.mockResolvedValue({
      id: 'q1',
      kind: QuestionKind.WRITTEN,
      modelAnswer: 'A full model answer.',
      options: [{ isCorrect: false }],
      deletedAt: null,
      publishedAt: null,
    });
    await expect(service.publish('q1')).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('publishes a WRITTEN question with a model answer and zero options', async () => {
    prisma.question.findUnique.mockResolvedValue({
      id: 'q1',
      kind: QuestionKind.WRITTEN,
      modelAnswer: 'A full model answer.',
      options: [],
      deletedAt: null,
      publishedAt: null,
    });
    prisma.question.update.mockResolvedValue({ id: 'q1', status: 'PUBLISHED' });
    const result = await service.publish('q1');
    expect(result).toEqual({ id: 'q1', status: 'PUBLISHED' });
    expect(prisma.question.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'PUBLISHED' }) }),
    );
  });

  it('rejects creating a WRITTEN draft with options', async () => {
    await expect(
      service.createDraft(
        { userId: 'u1', role: 'USER', sessionId: 's1' } as never,
        {
          title: 'Written question',
          content: 'Explain the concept.',
          categoryId: 'c1',
          kind: QuestionKind.WRITTEN,
          modelAnswer: 'Model answer.',
          options: [{ label: 'A', content: 'Alpha', isCorrect: false }],
        } as never,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects creating a WRITTEN draft without a model answer', async () => {
    await expect(
      service.createDraft(
        { userId: 'u1', role: 'USER', sessionId: 's1' } as never,
        {
          title: 'Written question',
          content: 'Explain the concept.',
          categoryId: 'c1',
          kind: QuestionKind.WRITTEN,
          options: [],
        } as never,
      ),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
