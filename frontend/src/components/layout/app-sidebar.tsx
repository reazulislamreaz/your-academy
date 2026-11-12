'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Shield } from 'lucide-react';
import { Suspense } from 'react';
import { BrandMark } from './brand-mark';
import { learnerLinkActive, learnerNavGroups } from './learner-nav';
import { cn } from '@/lib/utils';
import { useMe } from '@/features/auth/use-auth';

function SidebarNav() {
  const pathname = usePathname();
  useSearchParams();
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';

  return (
    <aside className="flex h-full w-[var(--app-sidebar-width,15.5rem)] shrink-0 flex-col border-r border-[var(--line)] bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--line)] px-4">
        <BrandMark href="/home" />
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3" aria-label="Study">
        {learnerNavGroups.map((group) => (
          <div key={group.title}>
            <p className="px-2.5 pb-1.5 text-xs font-semibold tracking-[0.12em] text-[var(--muted-strong)] uppercase">
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
                    className={cn(
                      'motion-nav-indicator flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm font-medium',
                      active
                        ? 'bg-[var(--highlight-soft)] text-[var(--highlight)]'
                        : 'text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {isAdmin ? (
        <div className="border-t border-[var(--line)] p-3">
          <Link
            href="/admin/dashboard"
            className="motion-nav-indicator flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
          >
            <Shield className="size-4 shrink-0 opacity-90" aria-hidden />
            Admin console
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

export function AppSidebar() {
  return (
    <Suspense
      fallback={
        <aside className="flex h-full w-[var(--app-sidebar-width,15.5rem)] shrink-0 border-r border-[var(--line)] bg-white" />
      }
    >
      <SidebarNav />
    </Suspense>
  );
}
