'use client';

import { useEffect } from 'react';

/**
 * Reference-counted body scroll lock shared by modals, drawers, and confirm dialogs.
 * Compensates for scrollbar width so sticky admin/learner sidebars do not jump.
 * Avoids `position: fixed` on desktop (that pattern breaks sticky shells); uses it
 * only on coarse-pointer / touch where iOS ignores overflow:hidden alone.
 */

type SavedScrollLock = {
  scrollY: number;
  bodyOverflow: string;
  bodyPaddingRight: string;
  bodyPosition: string;
  bodyTop: string;
  bodyWidth: string;
  bodyLeft: string;
  bodyRight: string;
  htmlOverflow: string;
  htmlOverscroll: string;
  usedFixed: boolean;
};

let lockCount = 0;
let saved: SavedScrollLock | null = null;

function scrollbarWidth(): number {
  if (typeof window === 'undefined') return 0;
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function prefersTouchScrollLock(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

function applyLock(): void {
  if (saved) return;
  const { body, documentElement } = document;
  const scrollY = window.scrollY;
  const sbw = scrollbarWidth();
  const usedFixed = prefersTouchScrollLock();

  saved = {
    scrollY,
    bodyOverflow: body.style.overflow,
    bodyPaddingRight: body.style.paddingRight,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyWidth: body.style.width,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    htmlOverflow: documentElement.style.overflow,
    htmlOverscroll: documentElement.style.overscrollBehavior,
    usedFixed,
  };

  documentElement.style.overflow = 'hidden';
  documentElement.style.overscrollBehavior = 'none';
  documentElement.setAttribute('data-scroll-locked', 'true');
  body.style.overflow = 'hidden';
  if (sbw > 0) {
    body.style.paddingRight = `${sbw}px`;
  }

  if (usedFixed) {
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
  }
}

function releaseLock(): void {
  if (!saved) return;
  const { body, documentElement } = document;
  const prev = saved;
  saved = null;

  body.style.overflow = prev.bodyOverflow;
  body.style.paddingRight = prev.bodyPaddingRight;
  body.style.position = prev.bodyPosition;
  body.style.top = prev.bodyTop;
  body.style.width = prev.bodyWidth;
  body.style.left = prev.bodyLeft;
  body.style.right = prev.bodyRight;
  documentElement.style.overflow = prev.htmlOverflow;
  documentElement.style.overscrollBehavior = prev.htmlOverscroll;
  documentElement.removeAttribute('data-scroll-locked');

  if (prev.usedFixed) {
    window.scrollTo(0, prev.scrollY);
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
