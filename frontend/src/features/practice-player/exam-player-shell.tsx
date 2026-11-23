'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExamBottomSheet } from '@/features/exam-ui/exam-bottom-sheet';
import { ExamCountdown } from '@/features/exam-ui/exam-countdown';
import { ExamNavigatorGrid } from '@/features/exam-ui/exam-navigator-grid';
import type { ExamOptionItem } from '@/features/exam-ui/exam-option-list';
import { ExamQuestionCard } from '@/features/exam-ui/exam-question-card';
import { ExamSubmitDialog } from '@/features/exam-ui/exam-submit-dialog';
import {
  ExamMobileBar,
  ExamStepControls,
  ExamTakeHeader,
} from '@/features/exam-ui/exam-take-chrome';
import { useExamHotkeys } from '@/features/exam-ui/use-exam-hotkeys';
import type { PracticeSetDetail } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import type { ExamAttemptApi } from './use-exam-attempt';

type Props = {
  set: PracticeSetDetail;
  attempt: ExamAttemptApi;
};

/** Authenticated PracticeSet player (server-saved attempt; see `useExamAttempt`). */
export function ExamPlayerShell({ set, attempt }: Props) {
  const q = attempt.currentQuestion;
  const busy = attempt.locked || attempt.submit.isPending;
  const [navOpen, setNavOpen] = useState(false);
  const [viewAll, setViewAll] = useState(false);

  // The hook re-renders every second (timer); route callbacks through a ref so
  // memoized question cards / navigator keep stable props between ticks.
  const api = useRef(attempt);
  api.current = attempt;
  const viewAllRef = useRef(viewAll);
  viewAllRef.current = viewAll;

  const questionIds = useMemo(() => set.questions.map((item) => item.id), [set.questions]);
  const optionItems = useMemo(
    () =>
      set.questions.map((item) =>
        item.options.map<ExamOptionItem>((opt) => ({
          value: opt.id,
          label: opt.label,
          content: opt.content,
        })),
      ),
    [set.questions],
  );

  const onSelect = useCallback(
    (questionId: string, optionId: string) => api.current.selectAnswer(questionId, optionId),
    [],
  );
  const onClear = useCallback((questionId: string) => api.current.clearAnswer(questionId), []);
  const onToggleMark = useCallback((questionId: string) => api.current.toggleMark(questionId), []);
  const goTo = useCallback((next: number) => {
    if (next < 0 || next >= api.current.totalQuestions) return;
    api.current.goTo(next);
    if (viewAllRef.current) {
      document.getElementById(`practice-q-${next + 1}`)?.scrollIntoView({
        block: 'start',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
  }, []);
  const goPrevious = useCallback(() => goTo(api.current.index - 1), [goTo]);
  const goNext = useCallback(() => goTo(api.current.index + 1), [goTo]);
  const onFocusQuestion = useCallback(
    (questionId: string) => {
      const i = questionIds.indexOf(questionId);
      if (i >= 0 && i !== api.current.index) api.current.goTo(i);
    },
    [questionIds],
  );
  const requestSubmit = useCallback(() => api.current.requestSubmit(), []);
  const toggleView = useCallback(() => setViewAll((v) => !v), []);
  const closeNav = useCallback(() => setNavOpen(false), []);
  const jumpFromSheet = useCallback(
    (i: number) => {
      setNavOpen(false);
      goTo(i);
    },
    [goTo],
  );

  const jumpFirstUnanswered = () => {
    const idx = set.questions.findIndex((item) => !attempt.answers[item.id]);
    if (idx >= 0) {
      attempt.setSubmitOpen(false);
      goTo(idx);
    }
  };

  useExamHotkeys({
    enabled: !busy,
    optionCount: q?.options.length ?? 0,
    onSelectIndex: (i) => {
      const opt = q?.options[i];
      if (q && opt) attempt.selectAnswer(q.id, opt.id);
    },
    onPrevious: goPrevious,
    onNext: goNext,
  });

  const subject = set.subcategory?.name ?? set.category?.name ?? null;
  const eyebrow = [practiceKindLabel(set.kind), set.examTag ? examLabel(set.examTag) : subject]
    .filter(Boolean)
    .join(' · ');
  const total = attempt.totalQuestions;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pt-3 pb-6 sm:px-5 sm:pt-4 lg:px-6">
      <ExamTakeHeader
        eyebrow={eyebrow}
        title={set.title}
        timer={
          attempt.remaining != null ? (
            <ExamCountdown
              remainingSeconds={attempt.remaining}
              totalSeconds={attempt.timerSeconds}
            />
          ) : (
            <Badge variant="outline">Untimed</Badge>
          )
        }
        status={
          attempt.saveState === 'saving' ? (
            'Saving…'
          ) : attempt.saveState === 'saved' ? (
            <span className="text-[var(--success-fg)]">All answers saved</span>
          ) : null
        }
        answered={attempt.answeredCount}
        total={total}
        marked={attempt.markedCount}
        viewAll={viewAll}
        onToggleView={toggleView}
        onSubmit={requestSubmit}
        submitDisabled={busy}
      />

      {attempt.warning ? (
        <Alert variant={attempt.warning === '1m' ? 'danger' : 'warning'} className="mt-3">
          {attempt.warning === '1m'
            ? '1 minute remaining. The exam will auto-submit when time reaches zero.'
            : '5 minutes remaining. Answers are saved automatically — submit when ready.'}{' '}
          <button
            type="button"
            className="cursor-pointer font-semibold underline"
            onClick={() => attempt.setWarning(null)}
          >
            Dismiss
          </button>
        </Alert>
      ) : null}

      {attempt.submit.isError ? (
        <Alert variant="danger" className="mt-3">
          Submit failed. Try again.
        </Alert>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
        <div className="min-w-0 space-y-4">
          {viewAll ? (
            set.questions.map((item, i) => (
              <ExamQuestionCard
                key={item.id}
                domId={`practice-q-${i + 1}`}
                questionId={item.id}
                number={i + 1}
                total={total}
                title={item.title}
                text={item.content}
                options={optionItems[i]!}
                selectedValue={attempt.answers[item.id]}
                marked={Boolean(attempt.marked[item.id])}
                active={i === attempt.index}
                disabled={busy}
                onSelect={onSelect}
                onClear={onClear}
                onToggleMark={onToggleMark}
                onFocusQuestion={onFocusQuestion}
              />
            ))
          ) : q ? (
            <ExamQuestionCard
              key={q.id}
              domId={`practice-q-${attempt.index + 1}`}
              questionId={q.id}
              number={attempt.index + 1}
              total={total}
              title={q.title}
              text={q.content}
              options={optionItems[attempt.index]!}
              selectedValue={attempt.answers[q.id]}
              marked={Boolean(attempt.marked[q.id])}
              disabled={busy}
              onSelect={onSelect}
              onClear={onClear}
              onToggleMark={onToggleMark}
            />
          ) : null}

          {viewAll ? (
            <div className="hidden justify-end lg:flex">
              <Button type="button" size="lg" disabled={busy} onClick={requestSubmit}>
                Submit exam
              </Button>
            </div>
          ) : (
            <ExamStepControls
              className="hidden lg:flex"
              index={attempt.index}
              total={total}
              disabled={busy}
              onPrevious={goPrevious}
              onNext={goNext}
              onSubmit={requestSubmit}
            />
          )}
        </div>

        <aside className="hidden space-y-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] lg:sticky lg:top-[calc(var(--header-h,4.25rem)+8.5rem)] lg:block">
          <ExamNavigatorGrid
            questionIds={questionIds}
            currentIndex={attempt.index}
            answers={attempt.answers}
            marked={attempt.marked}
            onJump={goTo}
          />
          <Button type="button" className="w-full" disabled={busy} onClick={requestSubmit}>
            Submit exam
          </Button>
        </aside>
      </div>

      <ExamMobileBar>
        <ExamStepControls
          index={attempt.index}
          total={total}
          disabled={busy}
          onPrevious={goPrevious}
          onNext={goNext}
          onSubmit={requestSubmit}
          onOpenNavigator={() => setNavOpen(true)}
        />
      </ExamMobileBar>

      <ExamBottomSheet open={navOpen} title="Questions" onClose={closeNav}>
        <ExamNavigatorGrid
          questionIds={questionIds}
          currentIndex={attempt.index}
          answers={attempt.answers}
          marked={attempt.marked}
          onJump={jumpFromSheet}
        />
        <Button
          type="button"
          className="mt-4 w-full"
          disabled={busy}
          onClick={() => {
            setNavOpen(false);
            attempt.requestSubmit();
          }}
        >
          Submit exam
        </Button>
      </ExamBottomSheet>

      <ExamSubmitDialog
        open={attempt.submitOpen}
        total={total}
        answered={attempt.answeredCount}
        marked={attempt.markedCount}
        pending={attempt.submit.isPending}
        onConfirm={attempt.confirmSubmit}
        onCancel={() => attempt.setSubmitOpen(false)}
        onJumpUnanswered={jumpFirstUnanswered}
      />
    </div>
  );
}
