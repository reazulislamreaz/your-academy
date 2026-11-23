'use client';

import { useRouter } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useExamCountdown } from '@/features/guest-exams/use-exam-countdown';
import { useTimedExamCandidate } from '@/features/guest-exams/use-timed-exam-candidate';
import { scrollExamToTop } from '@/features/guest-exams/scroll-exam-to-top';
import { ApiError } from '@/lib/api/client';
import { ExamBottomSheet } from './exam-bottom-sheet';
import { ExamCountdown } from './exam-countdown';
import { ExamIntro, introIcons } from './exam-intro';
import { ExamNavigatorGrid } from './exam-navigator-grid';
import type { ExamOptionItem } from './exam-option-list';
import { ExamQuestionCard } from './exam-question-card';
import { ExamSubmitDialog } from './exam-submit-dialog';
import { ExamMobileBar, ExamStepControls, ExamTakeHeader } from './exam-take-chrome';
import { optionLabelAt } from './option-labels';
import { useExamHotkeys } from './use-exam-hotkeys';

export type TimedSheetQuestion = { id: string; questionText: string; options: string[] };

/** Client-only progress kept in sessionStorage so a refresh resumes the attempt. */
export type TimedSheetSession = {
  userName: string;
  startedAtMs: number;
  answers: Record<string, string>;
  marked?: Record<string, boolean>;
  currentIndex?: number;
  viewAll?: boolean;
};

export type TimedSheetSubmitBody = {
  userName: string;
  userAnswers: Record<string, string>;
  elapsedSeconds: number;
  timedOut: boolean;
};

type Props = {
  /** Eyebrow, e.g. "Quiz" / "Model Test". */
  kindLabel: string;
  title: string;
  description?: string | null;
  tags?: string[];
  durationInMinutes: number;
  totalQuestions: number;
  questions: TimedSheetQuestion[];
  optionLabels: readonly string[];
  listHref: string;
  listLabel: string;
  loadSession: () => TimedSheetSession | null;
  saveSession: (session: TimedSheetSession) => void;
  clearSession: () => void;
  submitAttempt: (body: TimedSheetSubmitBody) => Promise<{ attemptId: string }>;
  resultHref: (attemptId: string) => string;
  submitErrorFallback: string;
  incompleteConfirmLabel?: string;
  incompleteCancelLabel?: string;
};

/**
 * Timed guest sheet for public Quiz (DEC-039) and Model Test (DEC-040).
 * Scoring stays server-side; this only collects selections (option text) and
 * submits once — on confirm or automatically when the timer reaches zero.
 */
export function TimedSheetPlayer(props: Props) {
  const {
    kindLabel,
    title,
    description,
    tags,
    durationInMinutes,
    totalQuestions,
    questions,
    optionLabels,
    listHref,
    listLabel,
    resultHref,
    submitErrorFallback,
    incompleteConfirmLabel,
    incompleteCancelLabel,
  } = props;
  const router = useRouter();
  const { accountName, canAutoStart, authReady } = useTimedExamCandidate();

  const [hydrated, setHydrated] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [startedAtMs, setStartedAtMs] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [index, setIndex] = useState(0);
  const [viewAll, setViewAll] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  // Callers pass inline storage/submit fns — keep the latest without re-running effects.
  const io = useRef(props);
  io.current = props;
  const submittingRef = useRef(false);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const userNameRef = useRef(userName);
  userNameRef.current = userName;

  const total = questions.length;
  const totalSeconds = Math.max(1, Math.floor(durationInMinutes)) * 60;
  const started = Boolean(userName && startedAtMs);

  useEffect(() => {
    const saved = io.current.loadSession();
    if (saved) {
      setUserName(saved.userName);
      setStartedAtMs(saved.startedAtMs);
      setAnswers(saved.answers);
      setMarked(saved.marked ?? {});
      setIndex(
        Math.min(
          Math.max(0, saved.currentIndex ?? 0),
          Math.max(0, io.current.questions.length - 1),
        ),
      );
      setViewAll(Boolean(saved.viewAll));
    }
    setHydrated(true);
  }, []);

  // Signed-in candidates always submit under their account name (DEC-045).
  useEffect(() => {
    if (!hydrated || !canAutoStart || !userName) return;
    if (userName !== accountName) setUserName(accountName);
  }, [accountName, canAutoStart, hydrated, userName]);

  useEffect(() => {
    if (!hydrated || !userName || !startedAtMs) return;
    io.current.saveSession({
      userName,
      startedAtMs,
      answers,
      marked,
      currentIndex: index,
      viewAll,
    });
  }, [answers, hydrated, index, marked, startedAtMs, userName, viewAll]);

  const startExam = useCallback(
    (name: string | null) => {
      const candidate = name ?? accountName;
      if (candidate.trim().length < 2) return;
      const now = Date.now();
      setUserName(candidate);
      setStartedAtMs(now);
      setAnswers({});
      setMarked({});
      setIndex(0);
      io.current.saveSession({ userName: candidate, startedAtMs: now, answers: {}, marked: {} });
      scrollExamToTop();
    },
    [accountName],
  );

  const submit = useCallback(
    async (timedOut: boolean) => {
      const name = userNameRef.current;
      if (!name || submittingRef.current || !startedAtMs) return;
      submittingRef.current = true;
      setSubmitting(true);
      setConfirmOpen(false);
      setError(null);
      const elapsedSeconds = timedOut
        ? Math.max(1, durationInMinutes) * 60
        : Math.min(totalSeconds, Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000)));
      try {
        const result = await io.current.submitAttempt({
          userName: name,
          userAnswers: answersRef.current,
          elapsedSeconds,
          timedOut,
        });
        io.current.clearSession();
        router.push(resultHref(result.attemptId));
      } catch (err) {
        submittingRef.current = false;
        setSubmitting(false);
        setError(err instanceof ApiError ? err.message : submitErrorFallback);
      }
    },
    [durationInMinutes, resultHref, router, startedAtMs, submitErrorFallback, totalSeconds],
  );

  // Timeout may submit with unanswered items — allowed by product rule for timer end.
  const onExpire = useCallback(() => void submit(true), [submit]);

  const selectAnswer = useCallback((questionId: string, option: string) => {
    if (submittingRef.current) return;
    setAnswers((prev) => (prev[questionId] === option ? prev : { ...prev, [questionId]: option }));
  }, []);
  const clearAnswer = useCallback((questionId: string) => {
    if (submittingRef.current) return;
    setAnswers((prev) => {
      if (!(questionId in prev)) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);
  const toggleMark = useCallback((questionId: string) => {
    setMarked((prev) => {
      const next = { ...prev };
      if (next[questionId]) delete next[questionId];
      else next[questionId] = true;
      return next;
    });
  }, []);

  const questionIds = useMemo(() => questions.map((q) => q.id), [questions]);
  const optionItems = useMemo(
    () =>
      questions.map((q) =>
        q.options.map<ExamOptionItem>((opt, i) => ({
          value: opt,
          label: optionLabelAt(optionLabels, i),
          content: opt,
        })),
      ),
    [optionLabels, questions],
  );

  const answeredCount = useMemo(
    () => questionIds.filter((id) => Boolean(answers[id]?.trim())).length,
    [answers, questionIds],
  );
  const markedCount = useMemo(
    () => questionIds.filter((id) => marked[id]).length,
    [marked, questionIds],
  );

  const viewAllRef = useRef(viewAll);
  viewAllRef.current = viewAll;
  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= questionIds.length) return;
      setIndex(next);
      if (viewAllRef.current) {
        document
          .getElementById(`sheet-q-${next + 1}`)
          ?.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
      } else {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    },
    [questionIds.length],
  );
  const indexRef = useRef(index);
  indexRef.current = index;
  const goPrevious = useCallback(() => goTo(indexRef.current - 1), [goTo]);
  const goNext = useCallback(() => goTo(indexRef.current + 1), [goTo]);
  const focusQuestion = useCallback(
    (questionId: string) => {
      const i = questionIds.indexOf(questionId);
      if (i >= 0) setIndex(i);
    },
    [questionIds],
  );
  const openConfirm = useCallback(() => setConfirmOpen(true), []);
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
    const i = questionIds.findIndex((id) => !answers[id]?.trim());
    if (i >= 0) {
      setConfirmOpen(false);
      goTo(i);
    }
  };

  const current = questions[index];
  useExamHotkeys({
    enabled: started && !submitting,
    optionCount: current?.options.length ?? 0,
    onSelectIndex: (i) => {
      const opt = current?.options[i];
      if (current && opt != null) selectAnswer(current.id, opt);
    },
    onPrevious: goPrevious,
    onNext: goNext,
  });

  if (!hydrated) {
    return (
      <div className="mx-auto flex min-h-[40vh] w-full max-w-3xl items-center justify-center px-4">
        <p className="text-sm text-[var(--muted)]" role="status">
          Loading…
        </p>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="guest-exam-player w-full px-3 py-5 sm:px-6 sm:py-10">
        <ExamIntro
          eyebrow={kindLabel}
          title={title}
          description={description}
          tags={tags}
          facts={[
            { icon: introIcons.questions, label: 'Questions', value: totalQuestions },
            { icon: introIcons.duration, label: 'Time limit', value: `${durationInMinutes} min` },
          ]}
          rules={[
            'The timer starts when you press Start and the exam submits itself at 00:00.',
            'Answers are kept in this browser tab — refreshing resumes where you left off.',
            'Use 1–4 or A–D to pick an option and ←/→ to move between questions.',
            'Mark tricky questions for review and come back from the question grid.',
          ]}
          askName={authReady && !canAutoStart}
          waiting={!authReady}
          backHref={listHref}
          backLabel={listLabel}
          onStart={startExam}
        />
      </div>
    );
  }

  const busy = submitting;

  return (
    <div className="guest-exam-player mx-auto w-full max-w-6xl overflow-x-clip px-3 pt-3 sm:px-5 sm:pt-5 lg:pb-10">
      <ExamTakeHeader
        eyebrow={kindLabel}
        title={title}
        timer={
          <SheetTimer
            totalSeconds={totalSeconds}
            durationInMinutes={durationInMinutes}
            startedAtMs={startedAtMs}
            onExpire={onExpire}
          />
        }
        status={userName ? <>Candidate: {userName}</> : null}
        answered={answeredCount}
        total={total}
        marked={markedCount}
        viewAll={viewAll}
        onToggleView={toggleView}
        onSubmit={openConfirm}
        submitDisabled={busy || total === 0}
      />

      {error ? (
        <Alert variant="danger" className="mt-3">
          {error}
        </Alert>
      ) : null}
      {submitting ? (
        <p className="mt-3 text-sm text-[var(--muted-strong)]" role="status">
          Submitting your answers…
        </p>
      ) : null}

      {total === 0 ? (
        <Alert variant="warning" className="mt-4">
          This exam has no questions yet.
        </Alert>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start lg:gap-6">
          <div className="min-w-0 space-y-4">
            {viewAll ? (
              questions.map((q, i) => (
                <ExamQuestionCard
                  key={q.id}
                  domId={`sheet-q-${i + 1}`}
                  questionId={q.id}
                  number={i + 1}
                  total={total}
                  text={q.questionText}
                  options={optionItems[i]!}
                  selectedValue={answers[q.id]}
                  marked={Boolean(marked[q.id])}
                  active={i === index}
                  disabled={busy}
                  onSelect={selectAnswer}
                  onClear={clearAnswer}
                  onToggleMark={toggleMark}
                  onFocusQuestion={focusQuestion}
                />
              ))
            ) : current ? (
              <ExamQuestionCard
                key={current.id}
                domId={`sheet-q-${index + 1}`}
                questionId={current.id}
                number={index + 1}
                total={total}
                text={current.questionText}
                options={optionItems[index]!}
                selectedValue={answers[current.id]}
                marked={Boolean(marked[current.id])}
                disabled={busy}
                onSelect={selectAnswer}
                onClear={clearAnswer}
                onToggleMark={toggleMark}
              />
            ) : null}

            {!viewAll ? (
              <ExamStepControls
                className="hidden lg:flex"
                index={index}
                total={total}
                disabled={busy}
                onPrevious={goPrevious}
                onNext={goNext}
                onSubmit={openConfirm}
              />
            ) : (
              <div className="hidden justify-end lg:flex">
                <Button type="button" size="lg" disabled={busy} onClick={openConfirm}>
                  Submit exam
                </Button>
              </div>
            )}
          </div>

          <aside className="hidden space-y-4 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] lg:sticky lg:top-[calc(var(--header-h,4.25rem)+8.5rem)] lg:block">
            <ExamNavigatorGrid
              questionIds={questionIds}
              currentIndex={index}
              answers={answers}
              marked={marked}
              onJump={goTo}
            />
            <Button type="button" className="w-full" disabled={busy} onClick={openConfirm}>
              Submit exam
            </Button>
          </aside>
        </div>
      )}

      {total > 0 ? (
        <ExamMobileBar>
          <ExamStepControls
            index={index}
            total={total}
            disabled={busy}
            onPrevious={goPrevious}
            onNext={goNext}
            onSubmit={openConfirm}
            onOpenNavigator={() => setNavOpen(true)}
          />
        </ExamMobileBar>
      ) : null}

      <ExamBottomSheet open={navOpen} title="Questions" onClose={closeNav}>
        <ExamNavigatorGrid
          questionIds={questionIds}
          currentIndex={index}
          answers={answers}
          marked={marked}
          onJump={jumpFromSheet}
        />
        <Button
          type="button"
          className="mt-4 w-full"
          disabled={busy}
          onClick={() => {
            setNavOpen(false);
            setConfirmOpen(true);
          }}
        >
          Submit exam
        </Button>
      </ExamBottomSheet>

      <ExamSubmitDialog
        open={confirmOpen}
        total={total}
        answered={answeredCount}
        marked={markedCount}
        pending={submitting}
        onConfirm={() => void submit(false)}
        onCancel={() => setConfirmOpen(false)}
        onJumpUnanswered={jumpFirstUnanswered}
        incompleteConfirmLabel={incompleteConfirmLabel}
        incompleteCancelLabel={incompleteCancelLabel}
      />
    </div>
  );
}

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

/** Owns the 1s tick so only this badge re-renders, not the question sheet. */
const SheetTimer = memo(function SheetTimer({
  totalSeconds,
  durationInMinutes,
  startedAtMs,
  onExpire,
}: {
  totalSeconds: number;
  durationInMinutes: number;
  startedAtMs: number | null;
  onExpire: () => void;
}) {
  const { remainingSeconds } = useExamCountdown({ durationInMinutes, startedAtMs, onExpire });
  return <ExamCountdown remainingSeconds={remainingSeconds} totalSeconds={totalSeconds} />;
});
