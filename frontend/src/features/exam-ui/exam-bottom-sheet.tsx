'use client';

import { X } from 'lucide-react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { LearnerThemePortal } from '@/components/theme/learner-theme-portal';
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock';

type Props = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/** Mobile/tablet bottom sheet (hidden ≥ lg where the side panel is visible). */
export function ExamBottomSheet({ open, title, onClose, children }: Props) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useBodyScrollLock(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <LearnerThemePortal>
      <div
        className="fixed inset-0 z-[70] lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <button
          type="button"
          tabIndex={-1}
          className="absolute inset-0 cursor-pointer bg-[color-mix(in_srgb,var(--ink)_40%,transparent)]"
          aria-label="Close"
          onClick={onClose}
        />
        <div
          data-scroll-lock-scrollable=""
          className="motion-drawer-in absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto overscroll-contain rounded-t-[1.25rem] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-[var(--ink)] shadow-[var(--shadow-lg)]"
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--line-strong)]" aria-hidden />
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 id={titleId} className="font-display text-base font-semibold text-[var(--ink)]">
              {title}
            </h2>
            <Button
              ref={closeRef}
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Close"
              onClick={onClose}
            >
              <X className="size-5" aria-hidden />
            </Button>
          </div>
          {children}
        </div>
      </div>
    </LearnerThemePortal>
  );
}
