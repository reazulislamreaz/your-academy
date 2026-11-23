'use client';

import { useEffect, useRef } from 'react';

type Options = {
  enabled: boolean;
  optionCount: number;
  onSelectIndex: (index: number) => void;
  onPrevious: () => void;
  onNext: () => void;
};

const LETTER_KEYS = ['a', 'b', 'c', 'd', 'e', 'f'];
const BANGLA_KEYS = ['ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ'];

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Exam keyboard shortcuts: 1–4 / A–D (and ক–ঘ) pick an option, ←/→ move between
 * questions. Ignored while typing, with modifiers, or while a modal dialog is open.
 */
export function useExamHotkeys({
  enabled,
  optionCount,
  onSelectIndex,
  onPrevious,
  onNext,
}: Options): void {
  const handlers = useRef({ optionCount, onSelectIndex, onPrevious, onNext });
  handlers.current = { optionCount, onSelectIndex, onPrevious, onNext };

  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const h = handlers.current;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        h.onPrevious();
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        h.onNext();
        return;
      }

      const key = e.key.toLowerCase();
      let index = -1;
      if (/^[1-9]$/.test(key)) index = Number(key) - 1;
      else if (LETTER_KEYS.includes(key)) index = LETTER_KEYS.indexOf(key);
      else if (BANGLA_KEYS.includes(e.key)) index = BANGLA_KEYS.indexOf(e.key);
      if (index < 0 || index >= h.optionCount) return;
      e.preventDefault();
      h.onSelectIndex(index);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
}
