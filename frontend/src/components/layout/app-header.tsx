'use client';

import { TrialStatusChip } from '@/components/access/trial-status-chip';
import { BrandMark } from './brand-mark';
import { MobileNav, type NavItem } from './mobile-nav';
import { UserMenu } from './user-menu';
import { useMe } from '@/features/auth/use-auth';

const baseLinks: NavItem[] = [
  { href: '/home', label: 'Dashboard', match: 'exact' },
  { href: '/questions', label: 'Questions', match: 'prefix' },
  { href: '/documents', label: 'PDFs', match: 'prefix' },
  { href: '/bookmarks', label: 'Saved', match: 'prefix' },
  { href: '/news', label: 'News', match: 'prefix' },
  { href: '/profile', label: 'Profile', match: 'prefix' },
];

/** Compact top bar — sidebar carries primary nav on desktop. */
export function AppHeader() {
  const me = useMe();
  const links =
    me.data?.role === 'ADMIN'
      ? [...baseLinks, { href: '/admin/dashboard', label: 'Admin' }]
      : baseLinks;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/90 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3 lg:hidden">
          <BrandMark href="/home" />
        </div>
        <div className="hidden min-w-0 items-center gap-3 lg:flex">
          <p className="truncate text-sm font-medium text-[var(--muted)]">
            {me.data ? `Signed in as ${me.data.name}` : 'Your Academy'}
          </p>
          <TrialStatusChip />
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden sm:block lg:hidden">
            <TrialStatusChip />
          </div>
          <div className="hidden md:block">
            <UserMenu />
          </div>
          <MobileNav
            items={links}
            trailing={<UserMenu compact />}
            breakpointClassName="lg:hidden"
          />
        </div>
      </div>
    </header>
  );
}
