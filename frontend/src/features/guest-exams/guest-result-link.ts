/** Persist a guest exam/model-test result pointer across registration. */

export type GuestResultLink = {
  kind: 'model-test' | 'exam';
  attemptId: string;
  resultPath: string;
  title: string;
  score: number;
  totalQuestions: number;
  percent: number;
  userName: string;
  savedAtMs: number;
};

const STORAGE_KEY = 'ya-guest-result-link';

export function saveGuestResultLink(link: GuestResultLink): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(link));
  } catch {
    // Ignore quota / private-mode failures — redirect still works via ?next=.
  }
}

export function loadGuestResultLink(): GuestResultLink | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestResultLink;
    if (
      !parsed ||
      (parsed.kind !== 'model-test' && parsed.kind !== 'exam') ||
      typeof parsed.attemptId !== 'string' ||
      typeof parsed.resultPath !== 'string' ||
      !parsed.resultPath.startsWith('/')
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearGuestResultLink(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
