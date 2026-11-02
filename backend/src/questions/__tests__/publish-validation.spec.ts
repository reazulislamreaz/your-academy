import { UnprocessableEntityException } from '@nestjs/common';
import { QuestionsService } from '../questions.service';

describe('QuestionsService publish validation', () => {
  const prisma = {
    question: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };
  const access = {};
  const audit = { record: jest.fn() };
  const service = new QuestionsService(prisma as never, access as never, audit as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects publish when zero correct options', async () => {
    prisma.question.findUnique.mockResolvedValue({
      id: 'q1',
      deletedAt: null,
      publishedAt: null,
      options: [
        { isCorrect: false },
        { isCorrect: false },
      ],
    });

    await expect(service.publish('q1')).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejects publish when two correct options', async () => {
    prisma.question.findUnique.mockResolvedValue({
      id: 'q1',
      deletedAt: null,
      publishedAt: null,
      options: [
        { isCorrect: true },
        { isCorrect: true },
      ],
    });

    await expect(service.publish('q1')).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
