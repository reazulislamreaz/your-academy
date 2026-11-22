'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Headset } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { LearnerThemePortal } from '@/components/theme/learner-theme-portal';
import { LearnerThemeToggle } from '@/components/theme/learner-theme-toggle';
import { useLearnerTheme } from '@/components/theme/learner-theme-provider';
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

/** Clean mobile study drawer — nav first, utilities in the footer. */
export function LearnerMobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const support = useSupportChat();
  const { theme } = useLearnerTheme();
  const inverseLogo = theme === 'dark';

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
    open && mounted ? (
      <LearnerThemePortal>
        <MobileDrawerBackdrop onClose={() => setOpen(false)} className="lg:hidden" />
        <MobileDrawerPanel
          id={panelId}
          label="Study navigation"
          panelRef={panelRef}
          title="Menu"
          subtitle={null}
          side="left"
          onClose={() => setOpen(false)}
          className="learner-mobile-drawer lg:hidden"
          inverseLogo={inverseLogo}
          headerExtra={
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-[var(--muted)]">Appearance</p>
              <LearnerThemeToggle className="size-9 rounded-full border-[var(--line)] bg-[var(--bg-muted)] shadow-none" />
            </div>
          }
        >
          <nav className="learner-mobile-nav flex flex-col gap-6" aria-label="Mobile study">
            {learnerNavGroups.map((group) => (
              <div key={group.title} className="learner-nav-group">
                <p className="learner-mobile-nav-title">{group.title}</p>
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
                        onClick={() => setOpen(false)}
                        className="learner-nav-link learner-mobile-nav-link motion-nav-indicator"
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

          <div className="mt-8 space-y-3 border-t border-[var(--line)]/80 pt-4">
            <button
              type="button"
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[var(--radius)] text-sm font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
              aria-label="Open support"
              onClick={() => {
                setOpen(false);
                support.setOpen(true);
              }}
            >
              <Headset className="size-4" aria-hidden strokeWidth={1.75} />
              Support
            </button>
            <UserMenu compact />
          </div>
        </MobileDrawerPanel>
      </LearnerThemePortal>
    ) : null;

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
