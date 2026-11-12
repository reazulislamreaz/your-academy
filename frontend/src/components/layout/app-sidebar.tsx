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
    <aside className="learner-sidebar flex h-full w-[var(--app-sidebar-width,16.25rem)] shrink-0 flex-col">
      <div className="flex h-[var(--header-h,3.75rem)] shrink-0 items-center px-5">
        <BrandMark href="/home" className="[&_img]:h-10" />
      </div>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 pb-4" aria-label="Study">
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
                      'learner-nav-link motion-nav-indicator flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium',
                      active
                        ? 'bg-[var(--highlight-soft)] font-semibold text-[var(--highlight)]'
                        : 'text-[var(--ink-soft)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-7 shrink-0 items-center justify-center rounded-[9px]',
                        active
                          ? 'bg-white/80 text-[var(--highlight)] shadow-[var(--shadow-sm)]'
                          : 'bg-transparent text-current',
                      )}
                    >
                      <Icon className="size-4" aria-hidden strokeWidth={active ? 2.25 : 2} />
                    </span>
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
            className="learner-nav-link motion-nav-indicator flex items-center gap-2.5 rounded-[var(--radius)] px-3 py-2.5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[9px]">
              <Shield className="size-4" aria-hidden />
            </span>
            Admin console
          </Link>
        </div>
      ) : (
        <div className="border-t border-[var(--line)] px-4 py-3">
          <p className="text-[0.6875rem] leading-relaxed text-[var(--muted)]">
            Practice daily. Answers stay private to your account.
          </p>
        </div>
      )}
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
