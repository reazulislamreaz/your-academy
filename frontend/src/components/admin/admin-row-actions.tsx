'use client';

import { MoreHorizontal } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Props = {
  /** Always-visible primary controls (Edit, Publish). */
  primary?: ReactNode;
  /** Overflow menu items — each should be a button/link that closes on click. */
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right';
};

/** Primary actions + overflow menu to keep dense tables readable. */
export function AdminRowActions({ primary, children, className, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const hasMenu = Boolean(children);

  return (
    <div
      ref={rootRef}
      className={cn(
        'relative flex flex-wrap items-center gap-1.5',
        align === 'right' && 'justify-end',
        className,
      )}
    >
      {primary}
      {hasMenu ? (
        <>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
          {open ? (
            <div
              id={menuId}
              role="menu"
              className={cn(
                'absolute z-30 mt-1 min-w-[10.5rem] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-1 shadow-[var(--shadow-lg)]',
                align === 'right' ? 'right-0 top-full' : 'left-0 top-full',
              )}
              onClick={() => setOpen(false)}
            >
              <div className="flex flex-col gap-0.5 [&_button]:w-full [&_button]:justify-start [&_a]:w-full">
                {children}
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
