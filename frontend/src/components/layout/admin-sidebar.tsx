'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { BrandMark } from './brand-mark';
import { adminNavGroups, isAdminNavActive } from './admin-nav';
import { UserMenu } from './user-menu';

const COLLAPSE_KEY = 'ya-admin-sidebar-collapsed';

type Props = {
  footerExtra?: ReactNode;
};

export function AdminSidebar({ footerExtra }: Props) {
  const pathname = usePathname();
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
        'admin-sidebar flex h-full shrink-0 flex-col transition-[width] duration-200 ease-[var(--ease-out)]',
        collapsed
          ? 'w-[var(--app-sidebar-collapsed-width,4.75rem)]'
          : 'w-[var(--app-sidebar-width,16.25rem)]',
      )}
      data-collapsed={collapsed ? 'true' : 'false'}
    >
      <div
        className={cn(
          'flex h-[var(--header-h,4.5rem)] shrink-0 items-center gap-2 border-b border-white/10',
          collapsed ? 'justify-center px-2' : 'justify-between px-4',
        )}
      >
        {collapsed ? (
          <BrandMark href="/" markOnly inverse className="[&_img]:h-8" />
        ) : (
          <BrandMark href="/" inverse className="[&_img]:h-9" />
        )}
        {!collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--admin-sidebar-muted)] transition-colors hover:bg-white/10 hover:text-white"
          >
            <PanelLeftClose className="size-4" aria-hidden strokeWidth={1.75} />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <div className="flex justify-center border-b border-white/10 py-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Expand sidebar"
            className="flex size-8 items-center justify-center rounded-[var(--radius-sm)] text-[var(--admin-sidebar-muted)] transition-colors hover:bg-white/10 hover:text-white"
          >
            <PanelLeftOpen className="size-4" aria-hidden strokeWidth={1.75} />
          </button>
        </div>
      ) : (
        <div className="border-b border-white/10 px-5 py-3">
          <p className="text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--admin-sidebar-muted)] uppercase">
            Admin console
          </p>
          <p className="mt-0.5 text-xs text-white/55">Your Academy operations</p>
        </div>
      )}

      <nav
        className={cn(
          'flex flex-1 flex-col gap-4 overflow-y-auto py-4',
          collapsed ? 'px-2' : 'px-3',
        )}
        aria-label="Admin"
      >
        {adminNavGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            {!collapsed ? (
              <p className="px-3 pb-1 text-[0.625rem] font-semibold tracking-[0.14em] text-[var(--admin-sidebar-muted)] uppercase">
                {group.title}
              </p>
            ) : null}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isAdminNavActive(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'admin-nav-link motion-nav-indicator flex items-center rounded-[var(--radius)] text-sm font-medium',
                    collapsed ? 'justify-center px-0 py-2.5' : 'gap-2.5 px-3 py-2.5',
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center">
                    <Icon className="size-4" aria-hidden strokeWidth={1.75} />
                  </span>
                  {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div
        className={cn(
          'border-t border-white/10',
          collapsed ? 'flex flex-col items-center gap-2 p-2' : 'flex items-center gap-2 px-3 py-3',
        )}
      >
        {!collapsed ? (
          <Link
            href="/"
            className="mr-auto truncate px-2 text-xs font-semibold text-[var(--admin-sidebar-muted)] hover:text-white"
          >
            ← Website
          </Link>
        ) : null}
        {footerExtra}
        <UserMenu variant="header" menuPlacement="top" />
      </div>
    </aside>
  );
}
