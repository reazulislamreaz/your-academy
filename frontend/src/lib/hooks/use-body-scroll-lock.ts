'use client';

import { useEffect } from 'react';

/**
 * Reference-counted body scroll lock for modals / drawers.
 *
 * Important: never use `position: fixed` + negative `top` on `body`. That pattern
 * shifts sticky admin/learner sidebars (`sticky top-0 h-screen`) upward by the
 * current scroll offset, clipping Overview / Users / etc. and leaving only the
 * lower nav + footer visible — exactly the /admin/users modal regression.
 *
 * Desktop: overflow + scrollbar-width padding.
 * Touch: same, plus a touchmove guard outside scrollable dialog panels.
 */

type SavedScrollLock = {
  bodyOverflow: string;
  bodyPaddingRight: string;
  htmlOverscroll: string;
};

let lockCount = 0;
let saved: SavedScrollLock | null = null;
let touchGuard: ((e: TouchEvent) => void) | null = null;

function scrollbarWidth(): number {
  if (typeof window === 'undefined') return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function isInsideScrollableOverlay(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      '.ya-dialog-panel, [data-scroll-lock-scrollable], [data-mobile-drawer-panel]',
    ),
  );
}

function applyLock(): void {
  if (saved) return;
  const { body, documentElement } = document;
  const sbw = scrollbarWidth();

  saved = {
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    htmlOverscroll: documentElement.style.overscrollBehavior,
  };

  documentElement.style.overscrollBehavior = 'none';
  documentElement.setAttribute('data-scroll-locked', 'true');
  body.style.overflow = 'hidden';
  if (sbw > 0) {
    body.style.paddingRight = `${sbw}px`;
  }

  // iOS / touch: overflow:hidden alone often still allows background scroll.
  touchGuard = (e: TouchEvent) => {
    if (e.touches.length > 1) return;
    if (isInsideScrollableOverlay(e.target)) return;
    e.preventDefault();
  };
  document.addEventListener('touchmove', touchGuard, { passive: false });
}

function releaseLock(): void {
  if (!saved) return;
  const { body, documentElement } = document;
  const prev = saved;
  saved = null;

  body.style.overflow = prev.bodyOverflow;
  body.style.paddingRight = prev.bodyPaddingRight;
  documentElement.style.overscrollBehavior = prev.htmlOverscroll;
  documentElement.removeAttribute('data-scroll-locked');

  if (touchGuard) {
    document.removeEventListener('touchmove', touchGuard);
    touchGuard = null;
  }
}

/** Lock document scroll while a modal/drawer is open. Safe with nested overlays. */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    lockCount += 1;
    if (lockCount === 1) applyLock();

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) releaseLock();
    };
  }, [locked]);
}

/** Force-clear locks after abrupt navigations (e.g. logout) if React cleanup raced. */
export function resetBodyScrollLock(): void {
  lockCount = 0;
  releaseLock();
}
