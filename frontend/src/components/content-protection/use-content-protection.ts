'use client';

import { useEffect, useState } from 'react';

/** Ctrl/Cmd shortcuts deterred while protected content is mounted (copy, cut, save, print, view-source, select-all). */
const BLOCKED_SHORTCUT_KEYS = new Set(['c', 'x', 's', 'p', 'u', 'a']);

/** True when the event target is somewhere the learner legitimately types or edits text. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]')) {
    return true;
  }
  return target instanceof HTMLElement && target.isContentEditable;
}

/**
 * Deterrent only: blocks common copy/save/print shortcuts at document level,
 * except while focus is in an editable field so search/answer inputs keep working.
 */
export function useBlockedShortcuts(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(event: KeyboardEvent): void {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      if (!BLOCKED_SHORTCUT_KEYS.has(event.key.toLowerCase())) return;
      if (isEditableTarget(event.target) || isEditableTarget(document.activeElement)) return;
      event.preventDefault();
    }
    document.addEventListener('keydown', onKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', onKeyDown, { capture: true });
  }, [enabled]);
}

/** Tracks whether the tab is hidden or the window has lost focus. */
export function useWindowInactive(enabled: boolean): boolean {
  const [inactive, setInactive] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setInactive(false);
      return;
    }
    const sync = (): void => {
      setInactive(document.visibilityState === 'hidden' || !document.hasFocus());
    };
    const onBlur = (): void => setInactive(true);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', sync);
    return () => {
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', sync);
    };
  }, [enabled]);

  return inactive;
}

/** `01712345789` → `017*****789`; short numbers are fully masked. */
export function maskWhatsapp(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7) return '*'.repeat(Math.max(digits.length, 3));
  return `${digits.slice(0, 3)}${'*'.repeat(digits.length - 6)}${digits.slice(-3)}`;
}

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

/**
 * One rotated tile as an SVG data URI, used as a CSS mask so the colour comes from
 * theme tokens (works in light and dark) and no per-tile DOM nodes are created.
 */
export function buildWatermarkMask(lines: string[]): string {
  const width = 320;
  const height = 180;
  const text = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${height / 2 + (i - (lines.length - 1) / 2) * 18}" text-anchor="middle" dominant-baseline="middle">${escapeXml(line)}</text>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><g transform="rotate(-24 ${width / 2} ${height / 2})" font-family="system-ui,sans-serif" font-size="14" font-weight="600" fill="#000">${text}</g></svg>`;
  return `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}")`;
}
