'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminNavItems } from './admin-nav';
import { BrandMark } from './brand-mark';

const ADMIN_NAV_GROUPS = [
  {
    title: 'Console',
    items: adminNavItems.filter((i) =>
      ['/admin/dashboard', '/admin/support', '/admin/users', '/admin/activity', '/admin/audit'].includes(
        i.href,
      ),
    ),
  },
  {
    title: 'Content',
    items: adminNavItems.filter((i) =>
      [
        '/admin/questions',
        '/admin/question-imports',
        '/admin/practice-sets',
        '/admin/categories',
        '/admin/news',
        '/admin/documents',
      ].includes(i.href),
    ),
  },
] as const;

/** Compact mobile admin chrome: logo + title + drawer (replaces the old horizontal chip strip). */
export function AdminMobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activeLabel =
    adminNavItems.find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))?.label ??
    'Admin';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

    document.documentElement.style.setProperty('--header-h', '56px');
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
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Admin navigation"
            className="motion-drawer-in fixed inset-x-0 top-[56px] bottom-0 z-[60] overflow-y-auto overscroll-contain border-t border-[var(--line)] bg-[var(--bg-elevated)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)] lg:hidden"
          >
            <nav className="flex flex-col gap-5" aria-label="Admin sections">
              {ADMIN_NAV_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="px-3 pb-2 text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
                    {group.title}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active =
                        pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          className={cn(
                            'flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-base font-medium',
                            active
                              ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                              : 'text-[var(--ink-soft)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]',
                          )}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center">
                            <Icon className="size-4" aria-hidden strokeWidth={1.75} />
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </nav>

            <div className="mt-6 border-t border-[var(--line)] pt-4">
              <Link
                href="/"
                className="block px-3 text-sm font-semibold text-[var(--accent)] hover:underline"
                onClick={() => setOpen(false)}
              >
                ← Back to website
              </Link>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg-elevated)] lg:hidden">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
        <BrandMark markOnly href="/" className="[&_img]:h-8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[0.65rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Admin
          </p>
          <p className="truncate text-sm font-semibold text-[var(--ink)]">{activeLabel}</p>
        </div>
        <Button
          ref={triggerRef}
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      {panel}
    </div>
  );
}
