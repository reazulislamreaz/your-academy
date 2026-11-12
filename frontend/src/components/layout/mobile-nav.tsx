'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type NavItem = {
  href: string;
  label: string;
  match?: 'exact' | 'prefix';
  id?: string;
};

function isActive(pathname: string, item: NavItem) {
  const href = item.href.split('?')[0]?.split('#')[0] || '/';
  if (item.match === 'exact') return pathname === href;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({
  items,
  trailing,
  leading,
  activeId,
  /** Tailwind breakpoint class when the hamburger is shown (default: below xl for marketing). */
  breakpointClassName = 'xl:hidden',
  className,
}: {
  items: NavItem[];
  trailing?: ReactNode;
  /** Optional block above links (e.g. mobile search). */
  leading?: ReactNode;
  /** When set, only the item with this id is treated as active. */
  activeId?: string | null;
  breakpointClassName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname, activeId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    // Portaled panel can't inherit --header-h from <header> (backdrop-filter
    // also traps position:fixed), so sync measured header height to :root.
    const header = document.querySelector('header');
    const height = header?.getBoundingClientRect().height;
    if (height) {
      document.documentElement.style.setProperty('--header-h', `${Math.round(height)}px`);
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  const panel =
    open && mounted
      ? createPortal(
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="motion-drawer-in fixed inset-x-0 top-[var(--header-h,4.5rem)] bottom-0 z-[60] overflow-y-auto overscroll-contain border-t border-[var(--line)] bg-[var(--bg-elevated)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)]"
          >
            {leading ? <div className="mb-4">{leading}</div> : null}
            <nav className="flex flex-col gap-1" aria-label="Mobile">
              {items.map((item) => {
                const active =
                  activeId != null
                    ? item.id === activeId
                    : item.label === 'Home'
                      ? pathname === '/'
                      : isActive(pathname, item);
                return (
                  <Link
                    key={item.id ?? item.label}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'rounded-[var(--radius)] px-3 py-3 text-base font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                      active
                        ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20'
                        : 'text-[var(--ink-soft)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]',
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {trailing ? <div className="mt-6 flex flex-col gap-2">{trailing}</div> : null}
          </div>,
          document.body,
        )
      : null;

  return (
    <div className={cn(breakpointClassName, className)}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {panel}
    </div>
  );
}

export function DesktopNav({
  items,
  activeId,
}: {
  items: NavItem[];
  activeId?: string | null;
}) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
      {items.map((item) => {
        const active =
          activeId != null ? item.id === activeId : isActive(pathname, item);
        return (
          <Link
            key={item.id ?? `${item.label}-${item.href}`}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'motion-nav-indicator rounded-full px-3.5 py-2 text-sm font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              active
                ? 'bg-[var(--accent)] text-[var(--accent-fg)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--muted-strong)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
