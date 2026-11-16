'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api/client';
import type { PracticeAttemptResult, PracticeSetDetail } from '@/lib/api/types';

export type ActiveAttemptPayload = NonNullable<PracticeSetDetail['activeAttempt']> & {
  id: string;
};

export type StartAttemptOptions = {
  timed: boolean;
  durationSeconds?: number;
};

type ProgressAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  markedForReview: boolean;
};

function buildProgressPayload(
  answers: Record<string, string>,
  marked: Record<string, boolean>,
  questionIds: string[],
): ProgressAnswer[] {
  // Always send every question so clears / unmarked rows sync to the server.
  return questionIds.map((questionId) => ({
    questionId,
    selectedOptionId: answers[questionId] ?? null,
    markedForReview: marked[questionId] === true,
  }));
}

export function useExamAttempt(set: PracticeSetDetail, slug: string) {
  const router = useRouter();
  const qc = useQueryClient();
  const questionIds = useMemo(() => set.questions.map((q) => q.id), [set.questions]);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [clockSkewMs, setClockSkewMs] = useState(0);
  const [warning, setWarning] = useState<'5m' | '1m' | null>(null);
  const [warned5, setWarned5] = useState(false);
  const [warned1, setWarned1] = useState(false);
  const [locked, setLocked] = useState(false);
  const [index, setIndex] = useState(0);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [submitOpen, setSubmitOpen] = useState(false);

  const answersRef = useRef(answers);
  const markedRef = useRef(marked);
  const saveTimerRef = useRef<number | null>(null);
  const submittedRef = useRef(false);
  const saveAckTimerRef = useRef<number | null>(null);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);
  useEffect(() => {
    markedRef.current = marked;
  }, [marked]);

  const applyActive = useCallback((data: ActiveAttemptPayload) => {
    setAttemptId(data.id);
    setExpiresAt(data.expiresAt ?? null);
    setTimerSeconds(data.timerSeconds ?? data.durationSeconds ?? null);
    if (data.serverNow) {
      setClockSkewMs(new Date(data.serverNow).getTime() - Date.now());
    }
    if (data.savedAnswers?.length) {
      const restoredAnswers: Record<string, string> = {};
      const restoredMarked: Record<string, boolean> = {};
      for (const row of data.savedAnswers) {
        if (row.selectedOptionId) restoredAnswers[row.questionId] = row.selectedOptionId;
        if (row.markedForReview) restoredMarked[row.questionId] = true;
      }
      setAnswers(restoredAnswers);
      setMarked(restoredMarked);
      answersRef.current = restoredAnswers;
      markedRef.current = restoredMarked;
    }
  }, []);

  const start = useMutation({
    mutationFn: (opts: StartAttemptOptions) =>
      apiFetch<ActiveAttemptPayload>(`/practice-sets/${slug}/attempts`, {
        method: 'POST',
        body: JSON.stringify({
          timed: opts.timed,
          ...(opts.timed && opts.durationSeconds != null
            ? { durationSeconds: opts.durationSeconds }
            : {}),
        }),
      }),
    onSuccess: applyActive,
  });

  const saveProgress = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{
        expiresAt?: string | null;
        timerSeconds?: number | null;
        serverNow?: string;
      }>(`/practice-attempts/${id}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          answers: buildProgressPayload(answersRef.current, markedRef.current, questionIds),
        }),
      }),
    onMutate: () => setSaveState('saving'),
    onSuccess: (data) => {
      if (data.expiresAt !== undefined) setExpiresAt(data.expiresAt ?? null);
      if (data.timerSeconds !== undefined) setTimerSeconds(data.timerSeconds ?? null);
      if (data.serverNow) setClockSkewMs(new Date(data.serverNow).getTime() - Date.now());
      setSaveState('saved');
      if (saveAckTimerRef.current) window.clearTimeout(saveAckTimerRef.current);
      saveAckTimerRef.current = window.setTimeout(() => setSaveState('idle'), 1600);
    },
    onError: () => setSaveState('idle'),
  });

  const submit = useMutation({
    mutationFn: (id: string) =>
      apiFetch<PracticeAttemptResult>(`/practice-attempts/${id}/submit`, {
        method: 'POST',
        body: JSON.stringify({
          answers: buildProgressPayload(answersRef.current, markedRef.current, questionIds),
        }),
      }),
    onSuccess: (result) => {
      submittedRef.current = true;
      setLocked(true);
      setSubmitOpen(false);
      void qc.invalidateQueries({ queryKey: ['practice-attempts'] });
      void qc.invalidateQueries({ queryKey: ['stats'] });
      void qc.invalidateQueries({ queryKey: ['exam-performance'] });
      router.push(`/results/${result.id}`);
    },
  });

  const queueSave = useCallback(
    (id: string) => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = window.setTimeout(() => {
        if (!submittedRef.current) saveProgress.mutate(id);
      }, 600);
    },
    [saveProgress],
  );

  const selectAnswer = useCallback(
    (questionId: string, optionId: string) => {
      if (locked || !attemptId) return;
      setAnswers((prev) => {
        const next = { ...prev, [questionId]: optionId };
        answersRef.current = next;
        return next;
      });
      queueSave(attemptId);
    },
    [attemptId, locked, queueSave],
  );

  const clearAnswer = useCallback(
    (questionId: string) => {
      if (locked || !attemptId) return;
      setAnswers((prev) => {
        const next = { ...prev };
        delete next[questionId];
        answersRef.current = next;
        return next;
      });
      queueSave(attemptId);
    },
    [attemptId, locked, queueSave],
  );

  const toggleMark = useCallback(
    (questionId: string) => {
      if (locked || !attemptId) return;
      setMarked((prev) => {
        const next = { ...prev, [questionId]: !prev[questionId] };
        if (!next[questionId]) delete next[questionId];
        markedRef.current = next;
        return next;
      });
      queueSave(attemptId);
    },
    [attemptId, locked, queueSave],
  );

  // Resume from detail payload.
  useEffect(() => {
    if (!set.activeAttempt) return;
    applyActive(set.activeAttempt);
    if (set.serverNow) {
      setClockSkewMs(new Date(set.serverNow).getTime() - Date.now());
    }
  }, [set.activeAttempt, set.serverNow, applyActive]);

  // Countdown + auto-submit at zero (no confirm).
  useEffect(() => {
    if (!expiresAt || !attemptId) {
      setRemaining(null);
      return;
    }
    const tick = () => {
      const now = Date.now() + clockSkewMs;
      const ms = new Date(expiresAt).getTime() - now;
      const secs = Math.max(0, Math.floor(ms / 1000));
      setRemaining(secs);
      if (secs <= 300 && secs > 60 && !warned5) {
        setWarned5(true);
        setWarning('5m');
      }
      if (secs <= 60 && secs > 0 && !warned1) {
        setWarned1(true);
        setWarning('1m');
      }
      if (secs <= 0 && !submittedRef.current && !submit.isPending) {
        setLocked(true);
        submittedRef.current = true;
        submit.mutate(attemptId);
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt, attemptId, clockSkewMs, warned5, warned1, submit.isPending, submit]);

  // Persist on tab hide / unload.
  useEffect(() => {
    if (!attemptId) return;
    const flush = () => {
      if (submittedRef.current) return;
      void apiFetch(`/practice-attempts/${attemptId}/progress`, {
        method: 'PATCH',
        body: JSON.stringify({
          answers: buildProgressPayload(answersRef.current, markedRef.current, questionIds),
        }),
      }).catch(() => undefined);
    };
    const onVis = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [attemptId, questionIds]);

  const answeredCount = useMemo(() => Object.keys(answers).length, [answers]);
  const markedCount = useMemo(
    () => Object.values(marked).filter(Boolean).length,
    [marked],
  );
  const unansweredCount = set.questions.length - answeredCount;
  const currentQuestion = set.questions[index] ?? null;

  const goTo = useCallback(
    (nextIndex: number) => {
      if (nextIndex < 0 || nextIndex >= set.questions.length) return;
      setIndex(nextIndex);
    },
    [set.questions.length],
  );

  const requestSubmit = useCallback(() => setSubmitOpen(true), []);
  const confirmSubmit = useCallback(() => {
    if (!attemptId || submittedRef.current) return;
    submit.mutate(attemptId);
  }, [attemptId, submit]);

  return {
    attemptId,
    index,
    currentQuestion,
    answers,
    marked,
    remaining,
    timerSeconds,
    warning,
    setWarning,
    locked,
    saveState,
    submitOpen,
    setSubmitOpen,
    answeredCount,
    unansweredCount,
    markedCount,
    totalQuestions: set.questions.length,
    start,
    submit,
    selectAnswer,
    clearAnswer,
    toggleMark,
    goTo,
    requestSubmit,
    confirmSubmit,
    applyActive,
  };
}

export type ExamAttemptApi = ReturnType<typeof useExamAttempt>;
