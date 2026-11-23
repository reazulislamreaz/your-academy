jest.mock('@nestjs/passport', () => ({
  AuthGuard: () => class MockAuthGuard {},
  PassportStrategy: () => class MockPassportStrategy {},
}));

import { GUARDS_METADATA } from '@nestjs/common/constants';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { PublicExamsController } from '../../exams/public-exams.controller';
import { PublicModelTestsController } from '../../model-tests/public-model-tests.controller';
import { PublicController } from '../public.controller';

/** DEC-051 — answer-bearing public routes must read the optional session. */
describe('Public answer-bearing routes', () => {
  const guardsOf = (ctrl: { prototype: object }, method: string): unknown[] =>
    (Reflect.getMetadata(
      GUARDS_METADATA,
      (ctrl.prototype as Record<string, unknown>)[method] as object,
    ) as unknown[]) ?? [];

  it.each([
    [PublicController, 'questions'],
    [PublicController, 'questionSetQuestions'],
    [PublicController, 'scoreQuestionSetPractice'],
    [PublicController, 'writtenQuestionSetQuestions'],
    [PublicController, 'topicQuestions'],
    [PublicController, 'topicSetQuestions'],
    [PublicExamsController, 'attemptResult'],
    [PublicModelTestsController, 'attemptResult'],
  ])('%p.%s uses OptionalJwtAuthGuard', (ctrl, method) => {
    expect(guardsOf(ctrl as never, method as string)).toContain(OptionalJwtAuthGuard);
  });

  it('marks signed-in responses private and asks AccessControlService', async () => {
    const publicService = {
      listPublishedQuestions: jest.fn().mockResolvedValue({ items: [], nextCursor: null, total: 0 }),
    };
    const access = { canViewerSeeAnswers: jest.fn().mockResolvedValue(true) };
    const ctrl = new PublicController(publicService as never, {} as never, access as never);
    const headers: Record<string, string> = {};
    const res = { setHeader: (k: string, v: string) => (headers[k] = v) };

    await ctrl.questions({ user: { userId: 'u1' } } as never, res as never);
    expect(access.canViewerSeeAnswers).toHaveBeenCalledWith({ userId: 'u1' });
    expect(publicService.listPublishedQuestions.mock.calls[0][1]).toEqual({ canViewAnswers: true });
    expect(headers['Cache-Control']).toBe('private, no-store');

    access.canViewerSeeAnswers.mockResolvedValue(false);
    await ctrl.questions({ user: null } as never, res as never);
    expect(headers['Cache-Control']).toContain('public');
    expect(publicService.listPublishedQuestions.mock.calls[1][1]).toEqual({ canViewAnswers: false });
  });
});
