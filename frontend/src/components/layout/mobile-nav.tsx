'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Briefcase,
  Home,
  Newspaper,
  PenLine,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock';
import {
  HamburgerIcon,
  MobileDrawerBackdrop,
  MobileDrawerPanel,
} from './mobile-drawer';

export type NavItem = {
  href: string;
  label: string;
  match?: 'exact' | 'prefix';
  id?: string;
  icon?: LucideIcon;
};

const FALLBACK_ICONS: Record<string, LucideIcon> = {
  home: Home,
  preli: BookOpen,
  written: PenLine,
  news: Newspaper,
  jobs: Briefcase,
};

function isActive(pathname: string, item: NavItem) {
  const href = item.href.split('?')[0]?.split('#')[0] || '/';
  if (item.match === 'exact') return pathname === href;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function resolveIcon(item: NavItem): LucideIcon {
  if (item.icon) return item.icon;
  if (item.id && FALLBACK_ICONS[item.id]) return FALLBACK_ICONS[item.id]!;
  return BookOpen;
}

export function MobileNav({
  items,
  trailing,
  leading,
  activeId,
  /** Tailwind breakpoint class when the hamburger is shown (default: below xl for marketing). */
  breakpointClassName = 'xl:hidden',
  className,
  title = 'Browse',
}: {
  items: NavItem[];
  trailing?: ReactNode;
  /** Optional block above links (e.g. mobile search). */
  leading?: ReactNode;
  /** When set, only the item with this id is treated as active. */
  activeId?: string | null;
  breakpointClassName?: string;
  className?: string;
  title?: string;
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

  useBodyScrollLock(open);

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
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      triggerRef.current?.focus();
    };
  }, [open]);

  const panel =
    open && mounted
      ? createPortal(
          <>
            <MobileDrawerBackdrop
              onClose={() => setOpen(false)}
              className={breakpointClassName || undefined}
            />
            <MobileDrawerPanel
              id={panelId}
              label="Navigation menu"
              panelRef={panelRef}
              title={title}
              onClose={() => setOpen(false)}
              headerExtra={leading}
              className={breakpointClassName || undefined}
            >
              <nav className="flex flex-col gap-1" aria-label="Mobile">
                <p className="px-3 pb-2 text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                  Pages
                </p>
                {items.map((item) => {
                  const Icon = resolveIcon(item);
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
                      onClick={() => setOpen(false)}
                      className={cn(
                        'flex min-h-12 items-center gap-3 rounded-[var(--radius-lg)] px-3 py-2.5 text-[0.9375rem] font-semibold transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                        active
                          ? 'bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]/20'
                          : 'text-[var(--ink-soft)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-9 shrink-0 items-center justify-center rounded-[var(--radius)]',
                          active
                            ? 'bg-[var(--accent)]/12 text-[var(--accent)]'
                            : 'bg-[var(--bg-muted)] text-[var(--muted-strong)]',
                        )}
                      >
                        <Icon className="size-4" aria-hidden strokeWidth={2.1} />
                      </span>
                      <span className="min-w-0 flex-1 text-pretty">{item.label}</span>
                      {active ? (
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-[var(--highlight)]"
                          aria-hidden
                        />
                      ) : null}
                    </Link>
                  );
                })}
              </nav>
              {trailing ? (
                <div className="mt-5 space-y-2 border-t border-[var(--line)] pt-4 [&_a]:min-h-11 [&_button]:min-h-11">
                  <p className="px-1 pb-1 text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                    Account
                  </p>
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
        className={cn(
          'size-11 rounded-full border border-transparent',
          open && 'border-[var(--line)] bg-[var(--bg-muted)]',
        )}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <HamburgerIcon open={open} />
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
