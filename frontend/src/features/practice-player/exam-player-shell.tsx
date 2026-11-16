'use client';

import { Alert } from '@/components/ui/alert';
import type { PracticeSetDetail } from '@/lib/api/types';
import { ExamHeader } from './exam-header';
import { ExamNavControls } from './exam-nav-controls';
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

  const jumpFirstUnanswered = () => {
    const idx = set.questions.findIndex((item) => !attempt.answers[item.id]);
    if (idx >= 0) {
      attempt.goTo(idx);
      attempt.setSubmitOpen(false);
    }
  };

  return (
    <div className="space-y-4 pb-24 lg:pb-6">
      <ExamHeader
        set={set}
        remaining={attempt.remaining}
        timerSeconds={attempt.timerSeconds}
        saveState={attempt.saveState}
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

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,280px)] lg:items-start">
        <div className="space-y-3">
          {q ? (
            <ExamQuestionPanel
              key={q.id}
              question={q}
              index={attempt.index}
              total={attempt.totalQuestions}
              selectedOptionId={attempt.answers[q.id]}
              disabled={busy}
              onSelect={(optionId) => attempt.selectAnswer(q.id, optionId)}
              onClear={() => attempt.clearAnswer(q.id)}
            />
          ) : null}

          <div className="hidden lg:block">
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

          <div className="lg:hidden">
            <ExamQuestionNavigator
              compact
              total={attempt.totalQuestions}
              currentIndex={attempt.index}
              answers={attempt.answers}
              marked={attempt.marked}
              questionIds={questionIds}
              onJump={attempt.goTo}
            />
          </div>
        </div>

        <aside className="hidden space-y-3 lg:sticky lg:top-4 lg:block">
          <ExamProgressCard
            total={attempt.totalQuestions}
            answered={attempt.answeredCount}
            unanswered={attempt.unansweredCount}
            marked={attempt.markedCount}
          />
          <ExamQuestionNavigator
            total={attempt.totalQuestions}
            currentIndex={attempt.index}
            answers={attempt.answers}
            marked={attempt.marked}
            questionIds={questionIds}
            onJump={attempt.goTo}
          />
        </aside>

        <div className="lg:hidden">
          <ExamProgressCard
            total={attempt.totalQuestions}
            answered={attempt.answeredCount}
            unanswered={attempt.unansweredCount}
            marked={attempt.markedCount}
          />
        </div>
      </div>

      {/* Sticky mobile nav */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--bg-elevated)]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[var(--shadow)] backdrop-blur lg:hidden">
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
