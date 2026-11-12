'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Shield, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { UserMenu } from './user-menu';
import { learnerLinkActive, learnerNavGroups } from './learner-nav';
import { cn } from '@/lib/utils';
import { useMe } from '@/features/auth/use-auth';

/** Grouped drawer matching desktop sidebar IA (lg:hidden). */
export function LearnerMobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const me = useMe();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

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
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Study navigation"
            className="motion-drawer-in fixed inset-x-0 top-[var(--header-h,3.75rem)] bottom-0 z-[60] overflow-y-auto overscroll-contain border-t border-[var(--line)] bg-[var(--bg-elevated)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[var(--shadow-lg)]"
          >
            <nav className="flex flex-col gap-5" aria-label="Mobile study">
              {learnerNavGroups.map((group) => (
                <div key={group.title}>
                  <p className="px-3 pb-2 text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
                    {group.title}
                  </p>
                  <div className="flex flex-col gap-0.5">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = learnerLinkActive(pathname, item);
                      return (
                        <Link
                          key={`${item.label}-${item.href}`}
                          href={item.href}
                          aria-current={active ? 'page' : undefined}
                          data-active={active ? 'true' : 'false'}
                          className={cn(
                            'learner-nav-link flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-base font-medium',
                            active
                              ? 'bg-[var(--highlight-soft)] font-semibold text-[var(--highlight)]'
                              : 'text-[var(--ink-soft)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]',
                          )}
                        >
                          <span
                            className={cn(
                              'flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]',
                              active
                                ? 'bg-white/80 text-[var(--highlight)] shadow-[var(--shadow-sm)]'
                                : 'bg-[var(--bg-muted)] text-current',
                            )}
                          >
                            <Icon className="size-4" aria-hidden />
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
              {me.data?.role === 'ADMIN' ? (
                <Link
                  href="/admin/dashboard"
                  className="flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-base font-medium text-[var(--ink-soft)] hover:bg-[var(--brand-wash)]"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--bg-muted)]">
                    <Shield className="size-4" aria-hidden />
                  </span>
                  Admin console
                </Link>
              ) : null}
            </nav>
            <div className="mt-6 border-t border-[var(--line)] pt-4">
              <UserMenu compact />
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="lg:hidden">
      <Button
        ref={triggerRef}
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
