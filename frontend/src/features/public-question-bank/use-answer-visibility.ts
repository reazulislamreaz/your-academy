'use client';

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'ya-preli-show-all-answers';

export type AnswerVisibilityMode = 'show-all' | 'hide-all';

function readStoredMode(): AnswerVisibilityMode {
  if (typeof window === 'undefined') return 'hide-all';
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === 'show-all' ? 'show-all' : 'hide-all';
  } catch {
    return 'hide-all';
  }
}

/** True when at least one loaded card carries an answer key (DEC-051: subscriber-only). */
export function hasAnyAnswerKey(items: ReadonlyArray<{ correctAnswerLabel?: string }>): boolean {
  return items.some((item) => Boolean(item.correctAnswerLabel));
}

/**
 * Global Show/Hide All Answers + per-question overrides (DEC-031).
 * `answersAvailable: false` (DEC-051 — API omitted the key) locks everything hidden.
 */
export function useAnswerVisibility(opts: { answersAvailable?: boolean } = {}) {
  const locked = opts.answersAvailable === false;
  const [mode, setModeState] = useState<AnswerVisibilityMode>('hide-all');
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setModeState(readStoredMode());
    setHydrated(true);
  }, []);

  const setMode = useCallback((next: AnswerVisibilityMode) => {
    setModeState(next);
    setRevealed({});
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore quota / private mode */
    }
  }, []);

  const isAnswerVisible = useCallback(
    (questionId: string) => {
      if (locked) return false;
      if (mode === 'show-all') return true;
      return Boolean(revealed[questionId]);
    },
    [locked, mode, revealed],
  );

  const toggleQuestion = useCallback(
    (questionId: string) => {
      if (mode === 'show-all') return;
      setRevealed((prev) => {
        const next = { ...prev };
        if (next[questionId]) delete next[questionId];
        else next[questionId] = true;
        return next;
      });
    },
    [mode],
  );

  return {
    mode,
    locked,
    setMode,
    isAnswerVisible,
    toggleQuestion,
    hydrated,
  };
}
