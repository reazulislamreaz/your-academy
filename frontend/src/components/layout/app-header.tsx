'use client';

import { BrandMark } from './brand-mark';
import { DesktopNav, MobileNav, type NavItem } from './mobile-nav';
import { UserMenu } from './user-menu';
import { useMe } from '@/features/auth/use-auth';

const baseLinks: NavItem[] = [
  { href: '/questions', label: 'Questions' },
  { href: '/documents', label: 'PDFs' },
  { href: '/bookmarks', label: 'Saved' },
  { href: '/news', label: 'News' },
  { href: '/profile', label: 'Profile' },
];

export function AppHeader() {
  const me = useMe();
  const links =
    me.data?.role === 'ADMIN'
      ? [...baseLinks, { href: '/admin/dashboard', label: 'Admin' }]
      : baseLinks;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)]/80 bg-[var(--bg-elevated)]/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <BrandMark />
        <DesktopNav items={links} />
        <div className="hidden md:block">
          <UserMenu />
        </div>
        <MobileNav items={links} trailing={<UserMenu compact />} />
      </div>
    </header>
  );
}
