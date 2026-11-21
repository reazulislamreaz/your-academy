'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LearnerThemePortal } from '@/components/theme/learner-theme-portal';
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock';
import { cn } from '@/lib/utils';

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, confirm uses the danger button variant. */
  destructive?: boolean;
  /** Short note on whether the action can be undone. */
  reversible?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const EXIT_MS = 160;

/**
 * Accessible confirm modal (replaces window.confirm).
 * Animated open/close; shared scroll lock; portals above sticky shells.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  reversible,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(open);
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    reduceMotionRef.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(id);
    }
    setVisible(false);
    if (!mounted) return;
    if (reduceMotionRef.current) {
      setMounted(false);
      return;
    }
    const t = window.setTimeout(() => setMounted(false), EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  useBodyScrollLock(mounted);

  useEffect(() => {
    if (!mounted || !visible) return;
    const prev = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) {
        onCancel();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [mounted, visible, pending, onCancel]);

  if (!mounted || typeof document === 'undefined') return null;

  return (
    <LearnerThemePortal>
      <div
        className={cn(
          'ya-dialog-root fixed inset-0 z-[90] flex items-end justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:items-center sm:p-4',
          visible && 'is-open',
        )}
        data-state={visible ? 'open' : 'closed'}
      >
        <button
          type="button"
          aria-label="Dismiss"
          className="ya-dialog-backdrop absolute inset-0 cursor-pointer border-0 bg-[color-mix(in_srgb,var(--ink)_42%,transparent)] backdrop-blur-[2px]"
          disabled={pending}
          tabIndex={-1}
          onClick={() => {
            if (!pending) onCancel();
          }}
        />
        <div
          ref={dialogRef}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={descId}
          data-state={visible ? 'open' : 'closed'}
          data-scroll-lock-scrollable=""
          className={cn(
            'ya-dialog-panel relative z-10 max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto overscroll-contain',
            'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 text-[var(--ink)] shadow-[var(--shadow-lg)] sm:p-6',
          )}
        >
          <h2 id={titleId} className="font-display text-lg font-semibold text-[var(--ink)]">
            {title}
          </h2>
          <div id={descId} className="mt-2 text-sm leading-relaxed text-[var(--ink-soft)]">
            {description}
          </div>
          {reversible != null ? (
            <p className="mt-3 text-xs font-medium text-[var(--muted-strong)]">
              {reversible ? 'This can be reversed later.' : 'This action cannot be undone.'}
            </p>
          ) : null}
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end [&>button]:w-full sm:[&>button]:w-auto">
            <Button
              ref={cancelRef}
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
            <Button
              type="button"
              variant={destructive ? 'danger' : 'primary'}
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? 'Working…' : confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </LearnerThemePortal>
  );
}
