'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Bookmark, MessageCircle } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { LearnerThemeToggle } from '@/components/theme/learner-theme-toggle';
import { useSupportChat } from '@/features/support/support-chat-provider';
import { useBodyScrollLock } from '@/lib/hooks/use-body-scroll-lock';
import {
  HamburgerIcon,
  MobileDrawerBackdrop,
  MobileDrawerPanel,
} from './mobile-drawer';
import { UserMenu } from './user-menu';
import { learnerLinkActive, learnerNavGroups } from './learner-nav';
import { cn } from '@/lib/utils';

/** Grouped drawer matching desktop sidebar IA (lg:hidden). */
export function LearnerMobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const support = useSupportChat();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useBodyScrollLock(open);

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
            <MobileDrawerBackdrop onClose={() => setOpen(false)} className="lg:hidden" />
            <MobileDrawerPanel
              id={panelId}
              label="Study navigation"
              panelRef={panelRef}
              title="Study desk"
              side="left"
              onClose={() => setOpen(false)}
              className="lg:hidden"
            >
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-muted)] p-3">
                <LearnerThemeToggle showLabel className="col-span-2 bg-[var(--bg-elevated)]" />
                <Link
                  href="/bookmarks"
                  className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 text-sm font-semibold text-[var(--ink)]"
                  onClick={() => setOpen(false)}
                >
                  <Bookmark className="size-4" aria-hidden />
                  Saved
                </Link>
                <Link
                  href="/news"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 text-sm font-semibold text-[var(--ink-soft)]"
                  onClick={() => setOpen(false)}
                >
                  <Bell className="size-4" aria-hidden />
                  News
                </Link>
                <button
                  type="button"
                  className="col-span-2 inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 text-sm font-semibold text-[var(--ink-soft)]"
                  aria-label="Open messages"
                  onClick={() => {
                    setOpen(false);
                    support.setOpen(true);
                  }}
                >
                  <MessageCircle className="size-4" aria-hidden />
                  Messages
                </button>
              </div>

              <nav className="flex flex-col gap-5" aria-label="Mobile study">
                {learnerNavGroups.map((group) => (
                  <div key={group.title} className="learner-nav-group">
                    <p className="learner-nav-group-title">{group.title}</p>
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = learnerLinkActive(pathname, item);
                        return (
                          <Link
                            key={`${item.label}-${item.href}`}
                            href={item.href}
                            aria-current={active ? 'page' : undefined}
                            data-active={active ? 'true' : 'false'}
                            onClick={() => setOpen(false)}
                            className="learner-nav-link motion-nav-indicator min-h-12 text-base"
                          >
                            <span className="learner-nav-icon" aria-hidden>
                              <Icon className="size-4" strokeWidth={1.75} />
                            </span>
                            <span className="learner-nav-label">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="mt-6 border-t border-[var(--line)] pt-4">
                <UserMenu compact />
              </div>
            </MobileDrawerPanel>
          </>,
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
        className={cn('size-11 rounded-full', open && 'bg-[var(--bg-muted)]')}
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
