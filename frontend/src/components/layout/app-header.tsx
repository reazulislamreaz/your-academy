'use client';

import Link from 'next/link';
import { BrandMark } from './brand-mark';
import { DesktopNav, MobileNav, type NavItem } from './mobile-nav';
import { Button } from '@/components/ui/button';

const links: NavItem[] = [
  { href: '/questions', label: 'Questions' },
  { href: '/documents', label: 'PDFs' },
  { href: '/bookmarks', label: 'Saved' },
  { href: '/news', label: 'News' },
  { href: '/profile', label: 'Profile' },
];

export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--bg-elevated)]"
      style={{ ['--header-h' as string]: '64px' }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <BrandMark />
        <DesktopNav items={links} />
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button variant="outline" size="sm">
              Sign in
            </Button>
          </Link>
        </div>
        <MobileNav
          items={links}
          trailing={
            <Link href="/login">
              <Button variant="outline" className="w-full">
                Sign in
              </Button>
            </Link>
          }
        />
      </div>
    </header>
  );
}
