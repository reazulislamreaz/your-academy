'use client';

import type { ReactNode, RefObject } from 'react';
import { cn } from '@/lib/utils';

type BackdropProps = {
  onClose: () => void;
  className?: string;
};

/** Dimmed scrim behind mobile drawers — tap to dismiss. */
export function MobileDrawerBackdrop({ onClose, className }: BackdropProps) {
  return (
    <button
      type="button"
      aria-label="Close menu"
      className={cn(
        'fixed inset-0 z-[55] bg-[color-mix(in_srgb,var(--ink)_42%,transparent)] backdrop-blur-[2px] lg:hidden',
        className,
      )}
      onClick={onClose}
    />
  );
}

type PanelProps = {
  id: string;
  label: string;
  panelRef?: RefObject<HTMLDivElement | null>;
  children: ReactNode;
  className?: string;
  /** Extra top offset beyond --header-h when needed. */
  topVar?: string;
};

/** Full-height panel under the sticky header with safe-area padding. */
export function MobileDrawerPanel({
  id,
  label,
  panelRef,
  children,
  className,
  topVar = 'var(--header-h, 4.5rem)',
}: PanelProps) {
  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={cn(
        'motion-drawer-in fixed inset-x-0 bottom-0 z-[60] overflow-y-auto overscroll-contain border-t border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-lg)]',
        'pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] pl-[max(1rem,env(safe-area-inset-left,0px))] pr-[max(1rem,env(safe-area-inset-right,0px))]',
        className,
      )}
      style={{ top: topVar }}
    >
      {children}
    </div>
  );
}
