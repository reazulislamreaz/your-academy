import type { PublicQuestionCard } from '@/lib/api/public-questions';
import type { PreliPracticeResult } from './preli-practice-session';

function correctOptionId(question: PublicQuestionCard): string | null {
  const label = question.correctAnswerLabel?.trim().toUpperCase();
  if (!label) return null;
  const match = question.options.find((o) => o.label.trim().toUpperCase() === label);
  return match?.id ?? null;
}

/** Client-side scoring for Preli Practice (public cards already expose correct labels). */
export function scorePreliPractice(input: {
  setId: string;
  setTitle: string;
  durationMinutes: number;
  elapsedSeconds: number;
  timedOut: boolean;
  questions: PublicQuestionCard[];
  answers: Record<string, string>;
}): PreliPracticeResult {
  let correctCount = 0;
  let wrongCount = 0;
  let skippedCount = 0;

  const answerSheet = input.questions.map((q) => {
    const selectedOptionId = input.answers[q.id]?.trim() || null;
    const correctId = correctOptionId(q);
    const isSkipped = !selectedOptionId;
    const isCorrect = Boolean(selectedOptionId && correctId && selectedOptionId === correctId);

    if (isSkipped) skippedCount += 1;
    else if (isCorrect) correctCount += 1;
    else wrongCount += 1;

    return {
      id: q.id,
      questionText: q.content?.trim() || q.title,
      options: q.options.map((o) => ({ id: o.id, label: o.label, content: o.content })),
      selectedOptionId,
      correctOptionId: correctId,
      correctAnswerLabel: q.correctAnswerLabel,
      isCorrect,
      isSkipped,
      explanation: null as string | null,
    };
  });

  const totalQuestions = input.questions.length;
  const score = correctCount;
  const percent =
    totalQuestions === 0 ? 0 : Math.round((correctCount / totalQuestions) * 1000) / 10;

  return {
    setId: input.setId,
    setTitle: input.setTitle,
    durationMinutes: input.durationMinutes,
    elapsedSeconds: input.elapsedSeconds,
    timedOut: input.timedOut,
    totalQuestions,
    correctCount,
    wrongCount,
    skippedCount,
    score,
    percent,
    answerSheet,
    finishedAtMs: Date.now(),
  };
}
