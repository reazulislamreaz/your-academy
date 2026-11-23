'use client';

import type { PublicExamDetail } from '@your-academy/shared';
import { LATIN_OPTION_LABELS } from '@/features/exam-ui/option-labels';
import { TimedSheetPlayer } from '@/features/exam-ui/timed-sheet-player';
import { submitPublicExamAttempt } from '@/lib/api/exams';
import { clearGuestExamSession, loadGuestExamSession, saveGuestExamSession } from './exam-session';

type Props = {
  exam: PublicExamDetail;
  /** Take/result URL prefix. Marketing: `/exams`; learner: `/live-quizzes`. */
  basePath?: string;
};

export function GuestExamPlayer({ exam, basePath = '/exams' }: Props) {
  const takeBase = basePath.replace(/\/$/, '') || '/exams';

  return (
    <TimedSheetPlayer
      kindLabel="Quiz"
      title={exam.title}
      description={exam.description}
      durationInMinutes={exam.durationInMinutes}
      totalQuestions={exam.totalQuestions}
      questions={exam.questions}
      optionLabels={LATIN_OPTION_LABELS}
      listHref={takeBase}
      listLabel="All quizzes"
      loadSession={() => loadGuestExamSession(exam.id)}
      saveSession={(session) => saveGuestExamSession({ examId: exam.id, ...session })}
      clearSession={() => clearGuestExamSession(exam.id)}
      submitAttempt={(body) => submitPublicExamAttempt(exam.id, body)}
      resultHref={(attemptId) => `${takeBase}/${exam.slug}/result/${attemptId}`}
      submitErrorFallback="Could not submit exam. Please try again."
    />
  );
}
