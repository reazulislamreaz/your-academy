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
    queryKey: ['stats'],
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
    const width = collapsed
      ? 'var(--app-sidebar-collapsed-width, 4.75rem)'
      : 'var(--app-sidebar-width, 16.25rem)';
    const shell = document.querySelector('.learner-theme') as HTMLElement | null;
    shell?.style.setProperty('--app-sidebar-current-width', width);
    document.documentElement.style.setProperty('--ya-learner-sidebar-w', width);
    return () => {
      document.documentElement.style.removeProperty('--ya-learner-sidebar-w');
    };
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
        'learner-sidebar flex h-full shrink-0 flex-col',
        collapsed
          ? 'w-[var(--app-sidebar-collapsed-width,4.75rem)]'
          : 'w-[var(--app-sidebar-width,16.25rem)]',
      )}
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div
        className={cn(
          'learner-sidebar-header flex h-[var(--header-h,4.5rem)] shrink-0 items-center gap-2',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {collapsed ? (
          <BrandMark href="/" markOnly inverse={inverseLogo} className="[&_img]:h-8" />
        ) : (
          <BrandMark href="/" inverse={inverseLogo} className="[&_img]:h-9" />
        )}
        {!collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="learner-sidebar-toggle"
          >
            <PanelLeftClose className="size-4" aria-hidden strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="flex justify-center border-b border-[var(--line)]/60 py-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="learner-sidebar-toggle"
          >
            <PanelLeftOpen className="size-4" aria-hidden strokeWidth={1.75} />
          </button>
        </div>
      ) : null}

      <nav
        className={cn(
          'learner-sidebar-nav flex flex-1 flex-col gap-5 overflow-y-auto pb-4',
          collapsed ? 'px-2 pt-3' : 'px-3 pt-4',
        )}
        aria-label="Study"
      >
        {learnerNavGroups.map((group) => (
          <div key={group.title} className="learner-nav-group">
            {!collapsed ? (
              <p className="learner-nav-group-title">{group.title}</p>
            ) : (
              <div className="learner-nav-group-rule" aria-hidden />
            )}
            <div className="flex flex-col gap-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = learnerLinkActive(pathname, item);
                const showSavedBadge =
                  item.href.startsWith('/bookmarks') &&
                  typeof savedCount === 'number' &&
                  savedCount > 0;
                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    data-active={active ? 'true' : 'false'}
                    className={cn(
                      'learner-nav-link motion-nav-indicator',
                      collapsed && 'is-collapsed',
                    )}
                  >
                    <span className="learner-nav-icon" aria-hidden>
                      <Icon className="size-4" strokeWidth={1.75} />
                      {showSavedBadge && collapsed ? (
                        <span className="learner-nav-dot" />
                      ) : null}
                    </span>
                    {!collapsed ? (
                      <>
                        <span className="learner-nav-label">{item.label}</span>
                        {showSavedBadge ? (
                          <span className="learner-nav-badge">
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
        <div className="learner-sidebar-footer">
          <p>Practice daily. Answers stay private to your account.</p>
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
