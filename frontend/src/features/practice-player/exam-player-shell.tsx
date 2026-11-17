'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import type { PracticeSetDetail } from '@/lib/api/types';
import { ExamHeader } from './exam-header';
import { ExamNavControls } from './exam-nav-controls';
import { ExamNavigatorSheet } from './exam-navigator-sheet';
import { ExamProgressCard } from './exam-progress-card';
import { ExamQuestionNavigator } from './exam-question-navigator';
import { ExamQuestionPanel } from './exam-question-panel';
import { ExamSubmitDialog } from './exam-submit-dialog';
import type { ExamAttemptApi } from './use-exam-attempt';

type Props = {
  set: PracticeSetDetail;
  attempt: ExamAttemptApi;
};

export function ExamPlayerShell({ set, attempt }: Props) {
  const q = attempt.currentQuestion;
  const questionIds = set.questions.map((item) => item.id);
  const busy = attempt.locked || attempt.submit.isPending;
  const [navOpen, setNavOpen] = useState(false);

  const jumpFirstUnanswered = () => {
    const idx = set.questions.findIndex((item) => !attempt.answers[item.id]);
    if (idx >= 0) {
      attempt.goTo(idx);
      attempt.setSubmitOpen(false);
    }
  };

  return (
    <div className="learner-page-pad-sticky space-y-3 px-3 pt-3 sm:space-y-4 sm:px-5 sm:pt-4 lg:px-6 lg:pb-6">
      <ExamHeader
        set={set}
        remaining={attempt.remaining}
        timerSeconds={attempt.timerSeconds}
        saveState={attempt.saveState}
        questionIndex={attempt.index}
        totalQuestions={attempt.totalQuestions}
        onEndExam={attempt.requestSubmit}
        endDisabled={busy}
      />

      {attempt.warning === '5m' ? (
        <Alert variant="warning">
          5 minutes remaining. Answers are saved automatically — submit when ready.{' '}
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={() => attempt.setWarning(null)}
          >
            Dismiss
          </button>
        </Alert>
      ) : null}
      {attempt.warning === '1m' ? (
        <Alert variant="danger">
          1 minute remaining. The exam will auto-submit when time reaches zero.{' '}
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={() => attempt.setWarning(null)}
          >
            Dismiss
          </button>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)] lg:items-start">
        <div className="min-w-0 space-y-3">
          {q ? (
            <ExamQuestionPanel
              key={q.id}
              question={q}
              index={attempt.index}
              total={attempt.totalQuestions}
              selectedOptionId={attempt.answers[q.id]}
              marked={Boolean(attempt.marked[q.id])}
              disabled={busy}
              onSelect={(optionId) => attempt.selectAnswer(q.id, optionId)}
              onClear={() => attempt.clearAnswer(q.id)}
              onToggleMark={() => attempt.toggleMark(q.id)}
            />
          ) : null}

          <div className="hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] lg:block">
            <ExamNavControls
              index={attempt.index}
              total={attempt.totalQuestions}
              marked={Boolean(q && attempt.marked[q.id])}
              disabled={busy}
              onPrevious={() => attempt.goTo(attempt.index - 1)}
              onNext={() => attempt.goTo(attempt.index + 1)}
              onToggleMark={() => q && attempt.toggleMark(q.id)}
              onFinish={attempt.requestSubmit}
            />
          </div>
        </div>

        <aside className="hidden space-y-3 lg:sticky lg:top-[calc(var(--header-h,3.75rem)+0.75rem)] lg:block">
          <ExamProgressCard
            total={attempt.totalQuestions}
            answered={attempt.answeredCount}
            unanswered={attempt.unansweredCount}
            marked={attempt.markedCount}
          />
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]">
            <ExamQuestionNavigator
              total={attempt.totalQuestions}
              currentIndex={attempt.index}
              answers={attempt.answers}
              marked={attempt.marked}
              questionIds={questionIds}
              onJump={attempt.goTo}
            />
          </div>
        </aside>
      </div>

      <div className="learner-sticky-chrome p-2.5 sm:p-3 lg:hidden">
        <ExamNavControls
          index={attempt.index}
          total={attempt.totalQuestions}
          marked={Boolean(q && attempt.marked[q.id])}
          disabled={busy}
          onPrevious={() => attempt.goTo(attempt.index - 1)}
          onNext={() => attempt.goTo(attempt.index + 1)}
          onToggleMark={() => q && attempt.toggleMark(q.id)}
          onFinish={attempt.requestSubmit}
          onOpenNavigator={() => setNavOpen(true)}
        />
      </div>

      <ExamNavigatorSheet
        open={navOpen}
        onClose={() => setNavOpen(false)}
        total={attempt.totalQuestions}
        currentIndex={attempt.index}
        answers={attempt.answers}
        marked={attempt.marked}
        questionIds={questionIds}
        answered={attempt.answeredCount}
        unanswered={attempt.unansweredCount}
        markedCount={attempt.markedCount}
        onJump={attempt.goTo}
      />

      {attempt.submit.isError ? (
        <Alert variant="danger">Submit failed. Try again.</Alert>
      ) : null}

      <ExamSubmitDialog
        open={attempt.submitOpen}
        answered={attempt.answeredCount}
        unanswered={attempt.unansweredCount}
        marked={attempt.markedCount}
        total={attempt.totalQuestions}
        pending={attempt.submit.isPending}
        onConfirm={attempt.confirmSubmit}
        onCancel={() => attempt.setSubmitOpen(false)}
        onJumpUnanswered={
          attempt.unansweredCount > 0 ? jumpFirstUnanswered : undefined
        }
      />
    </div>
  );
}
