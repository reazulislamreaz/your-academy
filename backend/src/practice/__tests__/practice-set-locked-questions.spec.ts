import { UnprocessableEntityException } from '@nestjs/common';
import { PracticeService } from '../practice.service';

/** SEC-2 — staff cannot put MCQs from paid (beyond free-N) Preli sets into free practice sets. */
describe('PracticeService — locked-set questions in practice sets', () => {
  const prisma = {
    question: { count: jest.fn(), findMany: jest.fn() },
    practiceSet: { create: jest.fn(), findUnique: jest.fn() },
  };
  const access = { freePreliSetIds: jest.fn() };
  const settings = { get: jest.fn() };
  const service = new PracticeService(
    prisma as never,
    {} as never,
    access as never,
    settings as never,
  );
  const admin = { userId: 'admin-1', role: 'ADMIN' as const, sessionId: 's1' };
  const dto = {
    title: 'Quiz',
    slug: 'quiz',
    kind: 'SUBJECT_QUIZ',
    categoryId: 'cat-1',
    questionIds: ['q-free', 'q-paid'],
  };

  beforeEach(() => {
    jest.resetAllMocks();
    settings.get.mockResolvedValue({ preliFreeSetCount: 10 });
    access.freePreliSetIds.mockResolvedValue(new Set(['set-free']));
    prisma.practiceSet.create.mockResolvedValue({ id: 'ps-1' });
  });

  it('rejects with 422 PRACTICE_SET_LOCKED_QUESTIONS and names the paid set', async () => {
    prisma.question.count
      .mockResolvedValueOnce(2) // assertQuestionsExist
      .mockResolvedValueOnce(1); // locked questions
    prisma.question.findMany.mockResolvedValue([{ uploadBatch: { displayName: '45th BCS' } }]);

    const err = await service.adminCreate(admin, dto as never).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(UnprocessableEntityException);
    const body = (err as UnprocessableEntityException).getResponse() as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe('PRACTICE_SET_LOCKED_QUESTIONS');
    expect(body.error.message).toContain('“45th BCS”');
    expect(body.error.message).toContain('first 10 free sets');
    expect(prisma.practiceSet.create).not.toHaveBeenCalled();
    // The lookup only counts questions whose set is NOT one of the free sets.
    expect(prisma.question.count).toHaveBeenLastCalledWith({
      where: { id: { in: dto.questionIds }, uploadBatchId: { not: null, notIn: ['set-free'] } },
    });
  });

  it('allows free-set and hand-made questions', async () => {
    prisma.question.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0);
    await expect(service.adminCreate(admin, dto as never)).resolves.toEqual({ id: 'ps-1' });
  });
});
