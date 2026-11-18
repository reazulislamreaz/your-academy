'use client';

import { X } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { BrandMark } from './brand-mark';
import { Button } from '@/components/ui/button';
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
        'motion-fade-in fixed inset-0 z-[55] cursor-pointer bg-[color-mix(in_srgb,var(--ink)_48%,transparent)] backdrop-blur-[3px]',
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
  /** Side the drawer slides from. */
  side?: 'left' | 'right';
  onClose: () => void;
  /** Optional title above the scroll region (defaults to Menu). */
  title?: string;
  /** Extra chrome under the header (e.g. search). */
  headerExtra?: ReactNode;
  /** Use inverse (light) brand mark on dark Orbit shells. */
  inverseLogo?: boolean;
};

/**
 * Full-height slide-in navigation drawer with branded header + close control.
 * Safe-area aware; scroll locked by the parent via `useBodyScrollLock`.
 */
export function MobileDrawerPanel({
  id,
  label,
  panelRef,
  children,
  className,
  side = 'right',
  onClose,
  title = 'Menu',
  headerExtra,
  inverseLogo = false,
}: PanelProps) {
  return (
    <div
      ref={panelRef}
      id={id}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={cn(
        'fixed inset-y-0 z-[60] flex w-[min(100vw-2.5rem,21rem)] flex-col',
        'border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--ink)] shadow-[var(--shadow-lg)]',
        'pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]',
        side === 'right'
          ? 'motion-drawer-slide-in right-0 border-l pl-0 pr-[env(safe-area-inset-right,0px)]'
          : 'motion-drawer-slide-in-left left-0 border-r pr-0 pl-[env(safe-area-inset-left,0px)]',
        className,
      )}
    >
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line)] px-4 py-3.5">
        <BrandMark markOnly inverse={inverseLogo} className="shrink-0 [&_img]:h-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold tracking-tight text-[var(--ink)]">
            {title}
          </p>
          <p className="truncate text-[11px] font-medium text-[var(--muted)]">Your Academy</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 rounded-full"
          aria-label="Close menu"
          onClick={onClose}
        >
          <X className="size-5" strokeWidth={2.25} />
        </Button>
      </div>

      {headerExtra ? (
        <div className="shrink-0 border-b border-[var(--line)] px-4 py-3">{headerExtra}</div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">{children}</div>
    </div>
  );
}

/** Animated 3-bar hamburger that morphs toward an X while open. */
export function HamburgerIcon({ open, className }: { open: boolean; className?: string }) {
  return (
    <span
      className={cn('relative inline-flex size-5 items-center justify-center', className)}
      aria-hidden
    >
      <span
        className={cn(
          'absolute h-[2px] w-[18px] rounded-full bg-current transition-[transform,opacity,top] duration-200 ease-[var(--ease-out)]',
          open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-[5px]',
        )}
      />
      <span
        className={cn(
          'absolute top-1/2 h-[2px] w-[18px] -translate-y-1/2 rounded-full bg-current transition-opacity duration-150',
          open ? 'opacity-0' : 'opacity-100',
        )}
      />
      <span
        className={cn(
          'absolute h-[2px] w-[18px] rounded-full bg-current transition-[transform,opacity,top] duration-200 ease-[var(--ease-out)]',
          open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'top-[13px]',
        )}
      />
    </span>
  );
}
