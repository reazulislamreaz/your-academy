/** Client-only study preferences (localStorage). Not a security boundary. */

const LAST_QUESTION_KEY = 'ya_last_question';
const PREFERRED_CATEGORIES_KEY = 'ya_preferred_categories';
const ONBOARDING_DONE_KEY = 'ya_onboarding_done';

export type LastQuestionPref = {
  id: string;
  title: string;
  categoryId?: string;
  categoryName?: string;
  filterQs?: string;
  updatedAt: string;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function getLastQuestion(): LastQuestionPref | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(LAST_QUESTION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LastQuestionPref;
  } catch {
    return null;
  }
}

export function setLastQuestion(pref: Omit<LastQuestionPref, 'updatedAt'>): void {
  if (!canUseStorage()) return;
  const payload: LastQuestionPref = { ...pref, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(LAST_QUESTION_KEY, JSON.stringify(payload));
}

export function getPreferredCategoryIds(): string[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(PREFERRED_CATEGORIES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function setPreferredCategoryIds(ids: string[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(PREFERRED_CATEGORIES_KEY, JSON.stringify(ids.slice(0, 3)));
}

export function isOnboardingDone(): boolean {
  if (!canUseStorage()) return true;
  return window.localStorage.getItem(ONBOARDING_DONE_KEY) === '1';
}

export function markOnboardingDone(): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(ONBOARDING_DONE_KEY, '1');
}

export function formatStudyMinutes(seconds: number): string {
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hours}h ${rem}m` : `${hours}h`;
}
