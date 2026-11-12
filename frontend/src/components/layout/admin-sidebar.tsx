'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useLogout, useMe } from '@/features/auth/use-auth';
import { BrandMark } from './brand-mark';
import { adminNavItems } from './admin-nav';
import { Button } from '@/components/ui/button';

const COLLAPSE_KEY = 'ya-admin-sidebar-collapsed';

export function AdminSidebar() {
  const pathname = usePathname();
  const me = useMe();
  const logout = useLogout();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);

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
          <BrandMark href="/" markOnly className="[&_img]:h-8" />
        ) : (
          <BrandMark href="/" className="[&_img]:h-9" />
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
      ) : (
        <p className="px-5 pb-3 text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
          Admin console
        </p>
      )}

      <nav
        className={cn('flex flex-1 flex-col gap-0.5 overflow-y-auto pb-4', collapsed ? 'px-2' : 'px-3')}
        aria-label="Admin"
      >
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'learner-nav-link motion-nav-indicator flex items-center rounded-[var(--radius)] text-sm font-medium',
                collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5',
                active
                  ? 'bg-[var(--bg-muted)] font-semibold text-[var(--ink)]'
                  : 'text-[var(--muted)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink-soft)]',
              )}
            >
              <span className="flex size-7 shrink-0 items-center justify-center">
                <Icon className="size-4" aria-hidden strokeWidth={1.75} />
              </span>
              {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className={cn('space-y-2 border-t border-[var(--line)]', collapsed ? 'p-2' : 'p-3')}>
        {!collapsed && me.data ? (
          <p className="truncate px-2 text-xs text-[var(--muted)]" title={me.data.name}>
            Signed in as <span className="font-medium text-[var(--ink-soft)]">{me.data.name}</span>
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'justify-start gap-2 text-[var(--muted)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]',
            collapsed ? 'w-full justify-center px-0' : 'w-full',
          )}
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed ? (logout.isPending ? 'Signing out…' : 'Sign out') : null}
        </Button>
      </div>
    </aside>
  );
}
