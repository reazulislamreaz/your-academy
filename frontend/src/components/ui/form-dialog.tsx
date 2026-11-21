'use client';

import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LearnerThemePortal } from '@/components/theme/learner-theme-portal';
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock';
import { cn } from '@/lib/utils';

export type FormDialogProps = {
  open: boolean;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  error?: string | null;
  /** Disable submit (e.g. invalid form). */
  disableSubmit?: boolean;
  onSubmit: () => void;
  onClose: () => void;
  className?: string;
};

const EXIT_MS = 160;

/**
 * Accessible modal for create/edit forms. Animated open/close; shared scroll lock.
 */
export function FormDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Save',
  cancelLabel = 'Cancel',
  pending = false,
  error,
  disableSubmit = false,
  onSubmit,
  onClose,
  className,
}: FormDialogProps) {
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
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
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    );
    (focusables?.[0] ?? closeRef.current)?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !pending) {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const items = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
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
  }, [mounted, visible, pending, onClose]);

  if (!mounted || typeof document === 'undefined') return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pending && !disableSubmit) onSubmit();
  };

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
            if (!pending) onClose();
          }}
        />
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={description ? descId : undefined}
          data-state={visible ? 'open' : 'closed'}
          data-scroll-lock-scrollable=""
          className={cn(
            'ya-dialog-panel relative z-10 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-lg flex-col overflow-hidden sm:max-h-[calc(100dvh-2rem)]',
            'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink)] shadow-[var(--shadow-lg)]',
            className,
          )}
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-lg font-semibold text-[var(--ink)]">
                {title}
              </h2>
              {description ? (
                <p id={descId} className="mt-1 text-sm leading-relaxed text-[var(--muted-strong)]">
                  {description}
                </p>
              ) : null}
            </div>
            <Button
              ref={closeRef}
              type="button"
              size="sm"
              variant="ghost"
              aria-label="Close"
              disabled={pending}
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          </div>
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
              {children}
              {error ? (
                <p className="text-sm font-medium text-[var(--danger-fg)]" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-[var(--line)] px-4 py-3 sm:flex-row sm:justify-end sm:px-5 [&>button]:w-full sm:[&>button]:w-auto">
              <Button type="button" variant="outline" disabled={pending} onClick={onClose}>
                {cancelLabel}
              </Button>
              <Button type="submit" disabled={pending || disableSubmit}>
                {pending ? 'Saving…' : confirmLabel}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </LearnerThemePortal>
  );
}
