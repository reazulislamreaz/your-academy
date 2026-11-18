'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  LEARNER_THEME_DEFAULT,
  isLearnerColorScheme,
  type LearnerColorScheme,
} from '@/lib/learner-theme';
import { cn } from '@/lib/utils';
import { useOptionalLearnerTheme } from './learner-theme-provider';

type Props = {
  children: ReactNode;
  /** Override portal mount node (defaults to document.body). */
  container?: Element | DocumentFragment | null;
};

function readShellTheme(): LearnerColorScheme {
  if (typeof document === 'undefined') return LEARNER_THEME_DEFAULT;
  const attr = document.querySelector('.learner-theme')?.getAttribute('data-theme');
  return isLearnerColorScheme(attr) ? attr : LEARNER_THEME_DEFAULT;
}

function shellIsAdmin(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('.learner-theme.admin-theme'));
}

/**
 * Portals UI to document.body while re-applying Orbit theme tokens.
 * Fixed drawers/modals escape `.learner-theme`; without this wrapper they keep `:root` light vars.
 * Re-renders instantly when the theme toggle updates context.
 */
export function LearnerThemePortal({ children, container }: Props) {
  const ctx = useOptionalLearnerTheme();
  const [mounted, setMounted] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAdmin(shellIsAdmin());
  }, []);

  const theme = ctx?.theme ?? (mounted ? readShellTheme() : LEARNER_THEME_DEFAULT);

  if (!mounted) return null;

  const target = container ?? document.body;

  return createPortal(
    <div
      className={cn('learner-theme', isAdmin && 'admin-theme')}
      data-theme={theme}
      data-theme-portal=""
      style={{
        colorScheme: theme,
        // Override `.learner-theme { background: var(--bg-desk) }` so the portal
        // does not paint a full-viewport desk wash behind fixed overlays.
        background: 'transparent',
      }}
    >
      {children}
    </div>,
    target,
  );
}
