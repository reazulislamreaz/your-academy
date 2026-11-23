'use client';

import type { PublicModelTestDetail } from '@your-academy/shared';
import { BANGLA_OPTION_LABELS } from '@/features/exam-ui/option-labels';
import { TimedSheetPlayer } from '@/features/exam-ui/timed-sheet-player';
import { submitPublicModelTestAttempt } from '@/lib/api/model-tests';
import {
  clearModelTestSession,
  loadModelTestSession,
  saveModelTestSession,
} from './model-test-session';

type Props = {
  modelTest: PublicModelTestDetail;
  /** Take/result URL prefix. Marketing: `/model-test`; learner: `/live-model-tests`. */
  basePath?: string;
};

export function ModelTestPlayer({ modelTest, basePath = '/model-test' }: Props) {
  const takeBase = basePath.replace(/\/$/, '') || '/model-test';
  const tags = [
    modelTest.category?.name,
    modelTest.examYear != null ? String(modelTest.examYear) : null,
  ].filter((t): t is string => Boolean(t));

  return (
    <TimedSheetPlayer
      kindLabel="Model Test"
      title={modelTest.title}
      description={modelTest.description}
      tags={tags}
      durationInMinutes={modelTest.durationInMinutes}
      totalQuestions={modelTest.totalQuestions}
      questions={modelTest.questions}
      optionLabels={BANGLA_OPTION_LABELS}
      listHref={takeBase}
      listLabel="All model tests"
      loadSession={() => loadModelTestSession(modelTest.id)}
      saveSession={(session) => saveModelTestSession({ modelTestId: modelTest.id, ...session })}
      clearSession={() => clearModelTestSession(modelTest.id)}
      submitAttempt={(body) => submitPublicModelTestAttempt(modelTest.id, body)}
      resultHref={(attemptId) => `${takeBase}/${modelTest.slug}/result/${attemptId}`}
      submitErrorFallback="Could not submit model test. Please try again."
      // DEC-040 wording for an incomplete submit.
      incompleteConfirmLabel="Skip & Submit Anyway"
      incompleteCancelLabel="Go Back & Complete"
    />
  );
}
