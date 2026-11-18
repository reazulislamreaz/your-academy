'use client';

import { MoreHorizontal } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Button } from '@/components/ui/button';
import { LearnerThemePortal } from '@/components/theme/learner-theme-portal';
import { cn } from '@/lib/utils';

type Props = {
  /** Always-visible primary controls (Edit, Publish). */
  primary?: ReactNode;
  /** Overflow menu items — each should be a button/link that closes on click. */
  children?: ReactNode;
  className?: string;
  align?: 'left' | 'right';
};

type MenuCoords = {
  top: number;
  left: number;
  minWidth: number;
  openUp: boolean;
};

/**
 * Primary actions + overflow menu.
 * Menu is portaled to `document.body` with fixed positioning so it is never
 * clipped by `Surface` overflow-hidden / transform containing blocks.
 */
export function AdminRowActions({ primary, children, className, align = 'right' }: Props) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<MenuCoords | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const menuEl = menuRef.current;
    const menuHeight = menuEl?.offsetHeight ?? 220;
    const menuWidth = Math.max(menuEl?.offsetWidth ?? 168, 168);
    const gap = 6;
    const pad = 8;
    const spaceBelow = window.innerHeight - rect.bottom - pad;
    const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
    const top = openUp ? rect.top - gap - menuHeight : rect.bottom + gap;
    let left =
      align === 'right' ? rect.right - menuWidth : rect.left;
    left = Math.min(Math.max(pad, left), window.innerWidth - menuWidth - pad);
    setCoords({
      top: Math.max(pad, top),
      left,
      minWidth: Math.max(168, rect.width),
      openUp,
    });
  }, [align]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onReposition = () => updatePosition();
    window.addEventListener('resize', onReposition);
    // Capture scroll from nested overflow containers too.
    window.addEventListener('scroll', onReposition, true);
    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      // Keep menu mounted while a confirm/alert dialog from a menu item is open.
      if (target instanceof Element && target.closest('[role="alertdialog"], [role="dialog"]')) {
        return;
      }
      setOpen(false);
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

  const menu =
    open && coords && typeof document !== 'undefined' ? (
      <LearnerThemePortal>
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          className={cn(
            'fixed z-[80] min-w-[10.5rem] rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-1 text-[var(--ink)] shadow-[var(--shadow-lg)]',
            'motion-pop',
          )}
          style={{
            top: coords.top,
            left: coords.left,
            minWidth: coords.minWidth,
          }}
          onClick={(e) => {
            // Close after choosing an item, but not when opening a nested confirm.
            const target = e.target as HTMLElement | null;
            if (target?.closest('[role="alertdialog"], [role="dialog"]')) return;
            if (target?.closest('button, a')) setOpen(false);
          }}
        >
          <div className="flex flex-col gap-0.5 [&_a]:w-full [&_button]:w-full [&_button]:justify-start">
            {children}
          </div>
        </div>
      </LearnerThemePortal>
    ) : null;

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
            ref={triggerRef}
            type="button"
            size="icon"
            variant="ghost"
            aria-label="More actions"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            onClick={() => setOpen((v) => !v)}
          >
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
          {menu}
        </>
      ) : null}
    </div>
  );
}
