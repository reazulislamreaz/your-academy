import { UserRole, UserStatus } from '@prisma/client';
import { QuestionsService } from '../questions.service';

describe('QuestionsService answer privacy', () => {
  const prisma = {
    question: {
      findFirst: jest.fn(),
    },
    user: {
      findUniqueOrThrow: jest.fn(),
    },
    questionBookmark: {
      findUnique: jest.fn(),
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

  const audit = { record: jest.fn() };
  const learningActivity = { record: jest.fn() };
  const service = new QuestionsService(
    prisma as never,
    access as never,
    audit as never,
    learningActivity as never,
  );

  const entitledUser = {
    id: 'u1',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    trialStartedAt: new Date(Date.now() - 60_000),
    trialEndsAt: new Date(Date.now() + 60_000),
  };

  const questionRow = {
    id: 'q1',
    title: 'Sample',
    content: 'Stem',
    difficulty: 'EASY',
    explanation: 'Because A',
    publishedAt: new Date(),
    category: { id: 'c1', name: 'Cat', slug: 'cat' },
    subcategory: null,
    options: [
      {
        id: 'o1',
        label: 'A',
        content: 'Alpha',
        isCorrect: true,
        sortOrder: 0,
      },
      {
        id: 'o2',
        label: 'B',
        content: 'Beta',
        isCorrect: false,
        sortOrder: 1,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    access.stripAnswerFields.mockImplementation(stripAnswerFields);
    prisma.question.findFirst.mockResolvedValue(questionRow);
    prisma.user.findUniqueOrThrow.mockResolvedValue(entitledUser);
    prisma.questionBookmark.findUnique.mockResolvedValue(null);
  });

  it('includes isCorrect and explanation when entitled', async () => {
    access.canViewAnswers.mockResolvedValue(true);
    const detail = await service.getPublishedDetail(
      { userId: 'u1', role: UserRole.USER, sessionId: 's1' },
      'q1',
    );
    expect(detail.answersVisible).toBe(true);
    expect(detail.explanation).toBe('Because A');
    expect(detail.options[0]).toMatchObject({ isCorrect: true });
  });

  it('omits isCorrect and explanation when not entitled (absence only)', async () => {
    access.canViewAnswers.mockResolvedValue(false);
    const detail = await service.getPublishedDetail(
      { userId: 'u1', role: UserRole.USER, sessionId: 's1' },
      'q1',
    );
    expect(detail.answersVisible).toBe(false);
    expect(detail.explanation).toBeUndefined();
    expect(detail.options[0]).toEqual({
      id: 'o1',
      label: 'A',
      content: 'Alpha',
      sortOrder: 0,
    });
    expect('isCorrect' in detail.options[0]).toBe(false);
  });
});
