import { ModelTestsService } from '../../model-tests/model-tests.service';
import { ExamsService } from '../exams.service';

/** DEC-051 — guest Quiz / Model Test results hide the key from non-entitled viewers. */
describe('Timed attempt result privacy (DEC-051)', () => {
  const attemptId = '11111111-1111-4111-8111-111111111111';
  const now = new Date('2026-11-23T10:00:00.000Z');
  const question = {
    id: 'q1',
    questionText: 'Capital?',
    options: ['Dhaka', 'Khulna', 'Sylhet', 'Rajshahi'],
    correctAnswer: 'Dhaka',
    explanation: 'Because.',
    sortOrder: 0,
  };
  const forbidden = ['correctAnswer', 'explanation', 'isCorrect'];

  describe('ExamsService.getAttemptResult', () => {
    const prisma = {
      examAttempt: { findUnique: jest.fn() },
      examQuestion: { findMany: jest.fn() },
    };
    const service = new ExamsService(prisma as never);

    beforeEach(() => {
      prisma.examAttempt.findUnique.mockResolvedValue({
        id: attemptId,
        examId: 'e1',
        userName: 'Guest',
        score: 0,
        correctCount: 0,
        wrongCount: 1,
        timedOut: false,
        elapsedSeconds: 30,
        submittedAt: now,
        userAnswers: { q1: 'Khulna' },
        exam: {
          id: 'e1',
          title: 'Quiz',
          slug: 'quiz',
          totalQuestions: 1,
          durationInMinutes: 5,
          isPublished: true,
        },
      });
      prisma.examQuestion.findMany.mockResolvedValue([question]);
    });

    it('returns score + own selections only for non-entitled viewers', async () => {
      const result = await service.getAttemptResult(attemptId, { canViewAnswers: false });
      expect(result.answersVisible).toBe(false);
      expect(result.score).toBe(0);
      expect(result.answerSheet[0].selectedAnswer).toBe('Khulna');
      for (const key of forbidden) expect(result.answerSheet[0]).not.toHaveProperty(key);
      expect(JSON.stringify(result)).not.toContain('Because.');
    });

    it('defaults to the non-entitled view', async () => {
      const result = await service.getAttemptResult(attemptId);
      expect(result.answerSheet[0]).not.toHaveProperty('correctAnswer');
    });

    it('returns the full key for entitled viewers', async () => {
      const result = await service.getAttemptResult(attemptId, { canViewAnswers: true });
      expect(result.answersVisible).toBe(true);
      expect(result.answerSheet[0]).toMatchObject({
        correctAnswer: 'Dhaka',
        explanation: 'Because.',
        isCorrect: false,
      });
    });
  });

  describe('ModelTestsService.getAttemptResult', () => {
    const prisma = {
      modelTestAttempt: { findUnique: jest.fn() },
      modelTestQuestion: { findMany: jest.fn() },
    };
    const service = new ModelTestsService(prisma as never);

    beforeEach(() => {
      prisma.modelTestAttempt.findUnique.mockResolvedValue({
        id: attemptId,
        modelTestId: 'm1',
        userName: 'Guest',
        score: 1,
        correctCount: 1,
        wrongCount: 0,
        skippedCount: 0,
        timedOut: false,
        elapsedSeconds: 30,
        submittedAt: now,
        userAnswers: { q1: 'Dhaka' },
        modelTest: {
          id: 'm1',
          title: 'MT',
          slug: 'mt',
          totalQuestions: 1,
          durationInMinutes: 5,
          examYear: 2025,
        },
      });
      prisma.modelTestQuestion.findMany.mockResolvedValue([question]);
    });

    it('hides key, explanations and correctness for non-entitled viewers', async () => {
      const result = await service.getAttemptResult(attemptId, { canViewAnswers: false });
      expect(result.answersVisible).toBe(false);
      expect(result.correctCount).toBe(1);
      expect(result.answerSheet[0].selectedAnswer).toBe('Dhaka');
      for (const key of forbidden) expect(result.answerSheet[0]).not.toHaveProperty(key);
    });

    it('returns everything for entitled viewers', async () => {
      const result = await service.getAttemptResult(attemptId, { canViewAnswers: true });
      expect(result.answerSheet[0]).toMatchObject({
        correctAnswer: 'Dhaka',
        explanation: 'Because.',
        isCorrect: true,
      });
    });
  });
});
