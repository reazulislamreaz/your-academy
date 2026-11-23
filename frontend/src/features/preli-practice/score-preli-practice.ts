import {
  scorePublicSetPractice,
  type PublicQuestionCard,
} from '@/lib/api/public-questions';
import type { PreliPracticeResult } from './preli-practice-session';

/**
 * DEC-051: scoring happens on the server — public cards no longer carry the answer key
 * for free viewers. Per-question correctness / key come back only for entitled viewers.
 */
export async function scorePreliPractice(input: {
  setId: string;
  setTitle: string;
  durationMinutes: number;
  elapsedSeconds: number;
  timedOut: boolean;
  questions: PublicQuestionCard[];
  answers: Record<string, string>;
}): Promise<PreliPracticeResult> {
  const answers: Record<string, string> = {};
  for (const [questionId, optionId] of Object.entries(input.answers)) {
    if (optionId?.trim()) answers[questionId] = optionId.trim();
  }
  const score = await scorePublicSetPractice(input.setId, answers);
  const scoredById = new Map(score.answerSheet.map((item) => [item.id, item]));

  const answerSheet: PreliPracticeResult['answerSheet'] = input.questions.map((q) => {
    const scored = scoredById.get(q.id);
    const selectedOptionId = scored ? scored.selectedOptionId : null;
    return {
      id: q.id,
      questionText: q.content?.trim() || q.title,
      options: q.options.map((o) => ({ id: o.id, label: o.label, content: o.content })),
      selectedOptionId,
      isSkipped: !selectedOptionId,
      ...(score.answersVisible && scored
        ? {
            correctOptionId: scored.correctOptionId ?? null,
            correctAnswerLabel: scored.correctAnswerLabel,
            isCorrect: scored.isCorrect,
          }
        : {}),
      explanation: null,
    };
  });

  return {
    setId: input.setId,
    setTitle: input.setTitle,
    durationMinutes: input.durationMinutes,
    elapsedSeconds: input.elapsedSeconds,
    timedOut: input.timedOut,
    totalQuestions: score.totalQuestions,
    correctCount: score.correctCount,
    wrongCount: score.wrongCount,
    skippedCount: score.skippedCount,
    score: score.score,
    percent: score.percent,
    answersVisible: score.answersVisible,
    answerSheet,
    finishedAtMs: Date.now(),
  };
}
