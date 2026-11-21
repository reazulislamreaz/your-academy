/** Client-only session for an in-progress guest Model Test (survives refresh). */

export type ModelTestSession = {
  modelTestId: string;
  userName: string;
  startedAtMs: number;
  answers: Record<string, string>;
};

function storageKey(modelTestId: string): string {
  return `ya-model-test:${modelTestId}`;
}

export function loadModelTestSession(modelTestId: string): ModelTestSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(modelTestId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ModelTestSession;
    if (
      !parsed ||
      parsed.modelTestId !== modelTestId ||
      typeof parsed.userName !== 'string' ||
      typeof parsed.startedAtMs !== 'number' ||
      !parsed.answers ||
      typeof parsed.answers !== 'object'
    ) {
      return null;
    }
    return {
      modelTestId,
      userName: parsed.userName,
      startedAtMs: parsed.startedAtMs,
      answers: parsed.answers,
    };
  } catch {
    return null;
  }
}

export function saveModelTestSession(session: ModelTestSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey(session.modelTestId), JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearModelTestSession(modelTestId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(storageKey(modelTestId));
  } catch {
    /* ignore */
  }
}
