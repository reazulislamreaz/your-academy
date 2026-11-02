'use client';

import { BrandMark } from './brand-mark';
import { DesktopNav, MobileNav, type NavItem } from './mobile-nav';
import { UserMenu } from './user-menu';

const links: NavItem[] = [
  { href: '/questions', label: 'Questions', match: 'prefix' },
  { href: '/news', label: 'News', match: 'prefix' },
  { href: '/documents', label: 'PDFs', match: 'prefix' },
];

export function MarketingHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--line)]/70 bg-[var(--bg)]/85 backdrop-blur-md">
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
