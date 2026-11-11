import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QuestionStatus, UserRole, UserStatus } from '@prisma/client';
import { UsersService } from '../users.service';

describe('UsersService study prefs', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
    },
    question: {
      findFirst: jest.fn(),
    },
  };

  const access = {
    getAccessSnapshot: jest.fn().mockResolvedValue({
      trialStartedAt: new Date().toISOString(),
      trialEndsAt: new Date().toISOString(),
      isTrialActive: true,
      hasActiveSubscription: false,
      role: UserRole.USER,
      entitlements: [],
    }),
  };

  const storage = {
    generateSignedDownloadUrl: jest.fn().mockResolvedValue(null),
  };

  const service = new UsersService(prisma as never, access as never, storage as never);

  const baseUser = {
    id: 'u1',
    name: 'Learner',
    whatsappNumber: '+8801000000001',
    email: null,
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    deletedAt: null,
    preferredCategoryIds: [] as string[],
    lastQuestionId: null as string | null,
    lastQuestionFilterQs: null as string | null,
    onboardingCompletedAt: null as Date | null,
    lastQuestion: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.user.findUnique.mockResolvedValue(baseUser);
    prisma.user.update.mockResolvedValue(baseUser);
  });

  it('rejects preferred categories that are not active roots', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: 'c1' }]);
    await expect(
      service.updateStudyPrefs(
        { userId: 'u1', role: UserRole.USER, sessionId: 's1' },
        { preferredCategoryIds: ['c1', 'c2'] },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists preferred categories and onboarding completion', async () => {
    prisma.category.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      preferredCategoryIds: ['c1', 'c2'],
      onboardingCompletedAt: new Date('2026-11-05T00:00:00.000Z'),
    });

    const result = await service.updateStudyPrefs(
      { userId: 'u1', role: UserRole.USER, sessionId: 's1' },
      { preferredCategoryIds: ['c1', 'c2'], onboardingCompleted: true },
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: expect.objectContaining({
        preferredCategoryIds: ['c1', 'c2'],
        onboardingCompletedAt: expect.any(Date),
      }),
    });
    expect(result.study.preferredCategoryIds).toEqual(['c1', 'c2']);
    expect(result.study.onboardingCompleted).toBe(true);
  });

  it('rejects lastQuestionId that is not a published question', async () => {
    prisma.question.findFirst.mockResolvedValue(null);
    await expect(
      service.updateStudyPrefs(
        { userId: 'u1', role: UserRole.USER, sessionId: 's1' },
        { lastQuestionId: 'q-missing' },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('persists last published question for continue learning', async () => {
    prisma.question.findFirst.mockResolvedValue({ id: 'q1' });
    prisma.user.findUnique.mockResolvedValue({
      ...baseUser,
      lastQuestionId: 'q1',
      lastQuestionFilterQs: 'categoryId=c1',
      lastQuestion: {
        id: 'q1',
        title: 'Stem',
        deletedAt: null,
        status: QuestionStatus.PUBLISHED,
        category: { id: 'c1', name: 'Cat' },
        subcategory: null,
      },
    });

    const result = await service.updateStudyPrefs(
      { userId: 'u1', role: UserRole.USER, sessionId: 's1' },
      { lastQuestionId: 'q1', lastQuestionFilterQs: 'categoryId=c1' },
    );

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: {
        lastQuestionId: 'q1',
        lastQuestionFilterQs: 'categoryId=c1',
      },
    });
    expect(result.study.lastQuestion).toMatchObject({
      id: 'q1',
      title: 'Stem',
      categoryName: 'Cat',
      filterQs: 'categoryId=c1',
    });
  });
});
