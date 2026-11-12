'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { useLearnerTheme } from '@/components/theme/learner-theme-provider';
import { BrandMark } from './brand-mark';
import { learnerLinkActive, learnerNavGroups } from './learner-nav';
import { cn } from '@/lib/utils';
import { useMe } from '@/features/auth/use-auth';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';
import type { UserStats } from '@/lib/api/types';

const COLLAPSE_KEY = 'ya-learner-sidebar-collapsed';

function SidebarNav() {
  const pathname = usePathname();
  useSearchParams();
  const me = useMe();
  const { theme } = useLearnerTheme();
  const [collapsed, setCollapsed] = useState(false);
  const inverseLogo = theme === 'dark';

  const stats = useQuery({
    queryKey: ['me-stats'],
    queryFn: () => apiFetch<UserStats>('/users/me/stats'),
    enabled: Boolean(me.data),
    staleTime: 60_000,
  });

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const root = document.querySelector('.learner-theme') as HTMLElement | null;
    if (!root) return;
    root.style.setProperty(
      '--app-sidebar-current-width',
      collapsed
        ? 'var(--app-sidebar-collapsed-width, 4.75rem)'
        : 'var(--app-sidebar-width, 16.25rem)',
    );
  }, [collapsed]);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const savedCount = stats.data?.questionBookmarks;

  return (
    <aside
      className={cn(
        'learner-sidebar flex h-full shrink-0 flex-col transition-[width] duration-200 ease-[var(--ease-out)]',
        collapsed
          ? 'w-[var(--app-sidebar-collapsed-width,4.75rem)]'
          : 'w-[var(--app-sidebar-width,16.25rem)]',
      )}
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div
        className={cn(
          'flex h-[var(--header-h,4.5rem)] shrink-0 items-center gap-2',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {collapsed ? (
          <BrandMark href="/home" markOnly inverse={inverseLogo} className="[&_img]:h-8" />
        ) : (
          <BrandMark href="/home" inverse={inverseLogo} className="[&_img]:h-9" />
        )}
        {!collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] transition-colors hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]"
          >
            <PanelLeftClose className="size-4" aria-hidden strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="flex justify-center pb-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] transition-colors hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]"
          >
            <PanelLeftOpen className="size-4" aria-hidden strokeWidth={1.75} />
          </button>
        </div>
      ) : null}

      <nav
        className={cn('flex flex-1 flex-col gap-4 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}
        aria-label="Study"
      >
        {learnerNavGroups.map((group) => (
          <div key={group.title}>
            {!collapsed ? (
              <p className="px-3 pb-2 text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
                {group.title}
              </p>
            ) : (
              <div className="mx-auto mb-2 h-px w-6 bg-[var(--line)]" aria-hidden />
            )}
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = learnerLinkActive(pathname, item);
                const showSavedBadge =
                  item.href.startsWith('/bookmarks') && typeof savedCount === 'number' && savedCount > 0;
                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    data-active={active ? 'true' : 'false'}
                    className={cn(
                      'learner-nav-link motion-nav-indicator flex items-center rounded-[var(--radius)] text-sm font-medium',
                      collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5',
                      active
                        ? 'bg-[var(--bg-muted)] font-semibold text-[var(--ink)]'
                        : 'text-[var(--muted)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink-soft)]',
                    )}
                  >
                    <span className="relative flex size-7 shrink-0 items-center justify-center">
                      <Icon className="size-4" aria-hidden strokeWidth={1.75} />
                      {showSavedBadge && collapsed ? (
                        <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-[var(--accent-blue)]" />
                      ) : null}
                    </span>
                    {!collapsed ? (
                      <>
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {showSavedBadge ? (
                          <span className="rounded-full bg-[var(--bg-muted)] px-1.5 py-0.5 text-[0.65rem] font-semibold text-[var(--muted-strong)] tabular-nums">
                            {savedCount > 99 ? '99+' : savedCount}
                          </span>
                        ) : null}
                      </>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed ? (
        <div className="border-t border-[var(--line)] px-4 py-3">
          <p className="text-[0.6875rem] leading-relaxed text-[var(--muted)]">
            Practice daily. Answers stay private to your account.
          </p>
        </div>
      ) : null}
    </aside>
  );
}

export function AppSidebar() {
  return (
    <Suspense
      fallback={
        <aside className="learner-sidebar flex h-full w-[var(--app-sidebar-width,16.25rem)] shrink-0" />
      }
    >
      <SidebarNav />
    </Suspense>
  );
}
