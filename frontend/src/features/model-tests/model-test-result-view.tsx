'use client';

import type { ModelTestAttemptResult } from '@your-academy/shared';
import { BANGLA_OPTION_LABELS } from '@/features/exam-ui/option-labels';
import { TimedResultView } from '@/features/exam-ui/timed-result-view';

type Props = {
  result: ModelTestAttemptResult;
  /** Listing + result URL prefix (default marketing `/model-test`). */
  basePath?: string;
};

export function ModelTestResultView({ result, basePath = '/model-test' }: Props) {
  const takeBase = basePath.replace(/\/$/, '') || '/model-test';

  return (
    <TimedResultView
      kind="model-test"
      kindLabel="Model Test"
      title={result.modelTest.title}
      slug={result.modelTest.slug}
      attemptId={result.attemptId}
      userName={result.userName}
      score={result.score}
      totalQuestions={result.modelTest.totalQuestions}
      correctCount={result.correctCount}
      wrongCount={result.wrongCount}
      skippedCount={result.skippedCount}
      percent={result.percent}
      timedOut={result.timedOut}
      elapsedSeconds={result.elapsedSeconds}
      durationInMinutes={result.modelTest.durationInMinutes}
      submittedAt={result.submittedAt}
      answerSheet={result.answerSheet}
      optionLabels={BANGLA_OPTION_LABELS}
      takeBase={takeBase}
      listLabel="More model tests"
      crossLink={{
        href: takeBase === '/live-model-tests' ? '/live-quizzes' : '/exams',
        label: 'Explore quizzes',
      }}
      tags={result.modelTest.examYear != null ? [String(result.modelTest.examYear)] : []}
    />
  );
}
