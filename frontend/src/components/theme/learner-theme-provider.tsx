'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  LEARNER_THEME_DEFAULT,
  isLearnerColorScheme,
  readStoredLearnerTheme,
  storeLearnerTheme,
  type LearnerColorScheme,
} from '@/lib/learner-theme';

type LearnerThemeContextValue = {
  theme: LearnerColorScheme;
  setTheme: (theme: LearnerColorScheme) => void;
  toggleTheme: () => void;
};

const LearnerThemeContext = createContext<LearnerThemeContextValue | null>(null);

/** Safe read when a portal may render outside the provider tree. */
export function useOptionalLearnerTheme(): LearnerThemeContextValue | null {
  return useContext(LearnerThemeContext);
}

function applyThemeToShell(theme: LearnerColorScheme, animate: boolean) {
  const roots = document.querySelectorAll<HTMLElement>('.learner-theme');
  if (!roots.length) return;
  const reduce =
    animate && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  roots.forEach((root) => {
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    if (!animate || reduce) return;
    root.classList.add('theme-transitioning');
    window.setTimeout(() => root.classList.remove('theme-transitioning'), 260);
  });
}

function readInitialTheme(): LearnerColorScheme {
  if (typeof window === 'undefined') return LEARNER_THEME_DEFAULT;
  const attr = document.querySelector('.learner-theme')?.getAttribute('data-theme');
  if (isLearnerColorScheme(attr)) return attr;
  return readStoredLearnerTheme();
}

export function LearnerThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<LearnerColorScheme>(readInitialTheme);

  useEffect(() => {
    const stored = readStoredLearnerTheme();
    setThemeState(stored);
    applyThemeToShell(stored, false);
  }, []);

  const setTheme = useCallback((next: LearnerColorScheme) => {
    if (!isLearnerColorScheme(next)) return;
    setThemeState(next);
    storeLearnerTheme(next);
    applyThemeToShell(next, true);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: LearnerColorScheme = prev === 'dark' ? 'light' : 'dark';
      storeLearnerTheme(next);
      applyThemeToShell(next, true);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme],
  );

  return <LearnerThemeContext.Provider value={value}>{children}</LearnerThemeContext.Provider>;
}

export function useLearnerTheme(): LearnerThemeContextValue {
  const ctx = useContext(LearnerThemeContext);
  if (!ctx) {
    throw new Error('useLearnerTheme must be used within LearnerThemeProvider');
  }
  return ctx;
}
