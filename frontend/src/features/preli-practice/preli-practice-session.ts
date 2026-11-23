/** Client-only session for an in-progress Preli Practice timed exam (survives refresh). */

export type PreliPracticeSession = {
  setId: string;
  setTitle: string;
  durationMinutes: number;
  startedAtMs: number;
  answers: Record<string, string>;
};

export type PreliPracticeResult = {
  setId: string;
  setTitle: string;
  durationMinutes: number;
  elapsedSeconds: number;
  timedOut: boolean;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  skippedCount: number;
  score: number;
  percent: number;
  /** DEC-051: false → no answer key / per-question correctness (non-entitled viewer). */
  answersVisible?: boolean;
  answerSheet: Array<{
    id: string;
    questionText: string;
    options: Array<{ id: string; label: string; content: string }>;
    selectedOptionId: string | null;
    /** Entitled viewers only (DEC-051). */
    correctOptionId?: string | null;
    correctAnswerLabel?: string;
    isCorrect?: boolean;
    isSkipped: boolean;
    explanation?: string | null;
  }>;
  finishedAtMs: number;
};

function sessionKey(setId: string): string {
  return `ya-preli-practice:${setId}`;
}

function resultKey(setId: string): string {
  return `ya-preli-practice-result:${setId}`;
}

export function loadPreliPracticeSession(setId: string): PreliPracticeSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(setId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreliPracticeSession;
    if (
      !parsed ||
      parsed.setId !== setId ||
      typeof parsed.setTitle !== 'string' ||
      typeof parsed.durationMinutes !== 'number' ||
      typeof parsed.startedAtMs !== 'number' ||
      !parsed.answers ||
      typeof parsed.answers !== 'object'
    ) {
      return null;
    }
    return {
      setId,
      setTitle: parsed.setTitle,
      durationMinutes: parsed.durationMinutes,
      startedAtMs: parsed.startedAtMs,
      answers: parsed.answers,
    };
  } catch {
    return null;
  }
}

export function savePreliPracticeSession(session: PreliPracticeSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(sessionKey(session.setId), JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearPreliPracticeSession(setId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(sessionKey(setId));
  } catch {
    /* ignore */
  }
}

export function savePreliPracticeResult(result: PreliPracticeResult): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(resultKey(result.setId), JSON.stringify(result));
  } catch {
    /* ignore */
  }
}

export function loadPreliPracticeResult(setId: string): PreliPracticeResult | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(resultKey(setId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PreliPracticeResult;
    if (!parsed || parsed.setId !== setId || !Array.isArray(parsed.answerSheet)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPreliPracticeResult(setId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(resultKey(setId));
  } catch {
    /* ignore */
  }
}
