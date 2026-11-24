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

/** Global Show/Hide All Answers + per-question overrides (DEC-031). */
export function useAnswerVisibility() {
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
      if (mode === 'show-all') return true;
      return Boolean(revealed[questionId]);
    },
    [mode, revealed],
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
    setMode,
    isAnswerVisible,
    toggleQuestion,
    hydrated,
  };
}
