'use client';

import type { ExamAttemptResult } from '@your-academy/shared';
import { LATIN_OPTION_LABELS } from '@/features/exam-ui/option-labels';
import { TimedResultView } from '@/features/exam-ui/timed-result-view';

type Props = {
  result: ExamAttemptResult;
  /** Listing + result URL prefix (default marketing `/exams`). */
  basePath?: string;
};

export function ExamResultView({ result, basePath = '/exams' }: Props) {
  const takeBase = basePath.replace(/\/$/, '') || '/exams';
  // The quiz result has no skipped total; count the API's own per-question flag.
  const skippedCount = result.answerSheet.filter((item) => item.isSkipped).length;
  // Quiz `wrongCount` also counts blanks (ExamsService.submit); show answered-wrong only
  // so Correct + Wrong + Skipped adds up to the total.
  const wrongCount = Math.max(0, result.wrongCount - skippedCount);

  return (
    <TimedResultView
      kind="exam"
      kindLabel="Quiz"
      title={result.exam.title}
      slug={result.exam.slug}
      attemptId={result.attemptId}
      userName={result.userName}
      score={result.score}
      totalQuestions={result.exam.totalQuestions}
      correctCount={result.correctCount}
      wrongCount={wrongCount}
      skippedCount={skippedCount}
      percent={result.percent}
      timedOut={result.timedOut}
      elapsedSeconds={result.elapsedSeconds}
      durationInMinutes={result.exam.durationInMinutes}
      submittedAt={result.submittedAt}
      answerSheet={result.answerSheet}
      optionLabels={LATIN_OPTION_LABELS}
      takeBase={takeBase}
      listLabel="More quizzes"
      crossLink={{
        href: takeBase === '/live-quizzes' ? '/live-model-tests' : '/model-test',
        label: 'Explore model tests',
      }}
    />
  );
}
