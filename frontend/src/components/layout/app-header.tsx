'use client';

import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import { TrialStatusChip } from '@/components/access/trial-status-chip';
import { BrandMark } from './brand-mark';
import { MobileNav, type NavItem } from './mobile-nav';
import { UpdatesMenu } from './updates-menu';
import { UserMenu } from './user-menu';
import { useMe } from '@/features/auth/use-auth';

const baseLinks: NavItem[] = [
  { href: '/home', label: 'Dashboard', match: 'exact' },
  { href: '/questions', label: 'Practice', match: 'prefix' },
  { href: '/documents', label: 'Papers', match: 'prefix' },
  { href: '/bookmarks', label: 'Saved', match: 'prefix' },
  { href: '/news', label: 'News', match: 'prefix' },
  { href: '/onboarding', label: 'Topics', match: 'prefix' },
  { href: '/profile', label: 'Profile', match: 'prefix' },
];

const titles: Record<string, string> = {
  '/home': 'Dashboard',
  '/questions': 'Practice',
  '/documents': 'Previous papers',
  '/bookmarks': 'My saved',
  '/news': 'News & circulars',
  '/onboarding': 'My topics',
  '/profile': 'Profile',
};

function pageTitle(pathname: string) {
  if (pathname.startsWith('/questions/')) return 'Practice';
  if (pathname.startsWith('/documents/')) return 'Document';
  if (pathname.startsWith('/news/')) return 'News';
  for (const [path, title] of Object.entries(titles)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return title;
  }
  return 'Dashboard';
}

/** Compact top bar inspired by QBookBD — title left, utilities right. */
export function AppHeader() {
  const me = useMe();
  const pathname = usePathname();
  const links =
    me.data?.role === 'ADMIN'
      ? [...baseLinks, { href: '/admin/dashboard', label: 'Admin' }]
      : baseLinks;

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--bg-muted)]/80 px-3 backdrop-blur-md sm:h-16 sm:gap-3 sm:px-6 sm:[--header-h:4rem]"
      style={{ '--header-h': '3.5rem' } as CSSProperties}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="lg:hidden">
          <BrandMark href="/home" markOnly />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">{pageTitle(pathname)}</p>
          <p className="hidden truncate text-xs text-[var(--muted)] md:block">
            Your progress, exam results, and quick practice options in one place.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <div className="hidden min-[400px]:block">
          <TrialStatusChip />
        </div>
        <UpdatesMenu />
        <div className="hidden md:block">
          <UserMenu />
        </div>
        <MobileNav items={links} trailing={<UserMenu compact />} breakpointClassName="lg:hidden" />
      </div>
    </header>
  );
}
