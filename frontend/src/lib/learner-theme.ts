/**
 * Shared Orbit color scheme for learner + admin shells.
 * Marketing / auth stay on `:root` tokens and are never toggled.
 */

export const LEARNER_THEME_STORAGE_KEY = 'ya-learner-color-scheme';

export type LearnerColorScheme = 'light' | 'dark';

export const LEARNER_THEME_DEFAULT: LearnerColorScheme = 'light';

export function isLearnerColorScheme(value: unknown): value is LearnerColorScheme {
  return value === 'light' || value === 'dark';
}

export function readStoredLearnerTheme(): LearnerColorScheme {
  if (typeof window === 'undefined') return LEARNER_THEME_DEFAULT;
  try {
    const raw = window.localStorage.getItem(LEARNER_THEME_STORAGE_KEY);
    return isLearnerColorScheme(raw) ? raw : LEARNER_THEME_DEFAULT;
  } catch {
    return LEARNER_THEME_DEFAULT;
  }
}

export function storeLearnerTheme(theme: LearnerColorScheme): void {
  try {
    window.localStorage.setItem(LEARNER_THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore quota / private mode */
  }
}

/** Inline FOUC boot — run as first child of `.learner-theme` shell. */
export const LEARNER_THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(LEARNER_THEME_STORAGE_KEY)};var t=localStorage.getItem(k);if(t!=='dark'&&t!=='light')t=${JSON.stringify(LEARNER_THEME_DEFAULT)};var el=document.currentScript&&document.currentScript.parentElement;if(!el)return;el.setAttribute('data-theme',t);el.style.colorScheme=t;}catch(e){}})();`;
