/** Client-only session for an in-progress guest exam (survives refresh). */

export type GuestExamSession = {
  examId: string;
  userName: string;
  startedAtMs: number;
  answers: Record<string, string>;
  /** Optional UI progress (added later — older sessions omit them). */
  marked?: Record<string, boolean>;
  currentIndex?: number;
  viewAll?: boolean;
};

function storageKey(examId: string): string {
  return `ya-guest-exam:${examId}`;
}

export function loadGuestExamSession(examId: string): GuestExamSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(examId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestExamSession;
    if (
      !parsed ||
      parsed.examId !== examId ||
      typeof parsed.userName !== 'string' ||
      typeof parsed.startedAtMs !== 'number' ||
      !parsed.answers ||
      typeof parsed.answers !== 'object'
    ) {
      return null;
    }
    return {
      examId,
      userName: parsed.userName,
      startedAtMs: parsed.startedAtMs,
      answers: parsed.answers,
      marked: isFlagRecord(parsed.marked) ? parsed.marked : undefined,
      currentIndex:
        typeof parsed.currentIndex === 'number' && Number.isInteger(parsed.currentIndex)
          ? parsed.currentIndex
          : undefined,
      viewAll: typeof parsed.viewAll === 'boolean' ? parsed.viewAll : undefined,
    };
  } catch {
    return null;
  }
}

export function saveGuestExamSession(session: GuestExamSession): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey(session.examId), JSON.stringify(session));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearGuestExamSession(examId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(storageKey(examId));
  } catch {
    /* ignore */
  }
}

function isFlagRecord(value: unknown): value is Record<string, boolean> {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value as Record<string, unknown>).every((v) => typeof v === 'boolean')
  );
}
