'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { MobileDrawerBackdrop, MobileDrawerPanel } from './mobile-drawer';

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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname, activeId]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    panel
      ?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')?.[0]
      ?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const nodes = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
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
      triggerRef.current?.focus();
    };
  }, [open]);

  const panel =
    open && mounted
      ? createPortal(
          <>
            <MobileDrawerBackdrop onClose={() => setOpen(false)} className="xl:hidden" />
            <MobileDrawerPanel
              id={panelId}
              label="Navigation menu"
              panelRef={panelRef}
              className="xl:hidden"
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
                        'min-h-11 rounded-[var(--radius)] px-3 py-3 text-base font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
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
              {trailing ? (
                <div className="mt-6 flex flex-col gap-2 [&_a]:min-h-11 [&_button]:min-h-11">
                  {trailing}
                </div>
              ) : null}
            </MobileDrawerPanel>
          </>,
          document.body,
        )
      : null;

  return (
    <div className={cn(breakpointClassName, className)}>
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="icon"
        className="size-11"
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
