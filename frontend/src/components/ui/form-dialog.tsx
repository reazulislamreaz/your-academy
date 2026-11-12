'use client';

import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

/**
 * Accessible modal for create/edit forms. Closes on Escape / backdrop when not pending.
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

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])',
    );
    (focusables?.[0] ?? closeRef.current)?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

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
      document.body.style.overflow = prevOverflow;
      prev?.focus?.();
    };
  }, [open, pending, onClose]);

  if (!open) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!pending && !disableSubmit) onSubmit();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label="Dismiss"
        className="absolute inset-0 bg-[var(--ink)]/40 backdrop-blur-[2px]"
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
        className={cn(
          'relative z-10 w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--line)]',
          'motion-scale-in bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
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
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
          {children}
          {error ? (
            <p className="text-sm font-medium text-[var(--danger-fg)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-end">
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
  );
}
