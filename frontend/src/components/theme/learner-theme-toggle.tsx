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
        'inline-flex size-10 items-center justify-center rounded-[12px] border border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink-soft)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-soft)] hover:text-[var(--ink)]',
        showLabel && 'w-auto gap-2 px-2.5 sm:px-3',
        className,
      )}
    >
      {isDark ? (
        <Moon className="size-[18px] shrink-0 text-[var(--insight)]" aria-hidden strokeWidth={1.75} />
      ) : (
        <Sun className="size-[18px] shrink-0 text-[var(--bookmark)]" aria-hidden strokeWidth={1.75} />
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
