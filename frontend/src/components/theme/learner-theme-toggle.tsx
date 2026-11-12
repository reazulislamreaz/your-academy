'use client';

import { Moon, Sun } from 'lucide-react';
import { useLearnerTheme } from '@/components/theme/learner-theme-provider';
import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  /** Show Light/Dark label beside the icon (desktop header). */
  showLabel?: boolean;
};

/** Sun / Moon switch — learner shell only. */
export function LearnerThemeToggle({ className, showLabel = false }: Props) {
  const { theme, toggleTheme } = useLearnerTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      title={isDark ? 'Dark mode · switch to light' : 'Light mode · switch to dark'}
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--muted)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
        showLabel ? 'min-w-10 px-2.5 sm:px-3' : 'w-10',
        className,
      )}
    >
      {isDark ? (
        <Moon className="size-4 shrink-0 text-[var(--insight)]" aria-hidden strokeWidth={1.75} />
      ) : (
        <Sun className="size-4 shrink-0 text-[var(--bookmark)]" aria-hidden strokeWidth={1.75} />
      )}
      {showLabel ? (
        <span className="hidden text-xs font-semibold tracking-wide text-[var(--ink-soft)] sm:inline">
          {isDark ? 'Dark' : 'Light'}
        </span>
      ) : null}
      <span className="sr-only">{isDark ? 'Dark mode active' : 'Light mode active'}</span>
    </button>
  );
}
