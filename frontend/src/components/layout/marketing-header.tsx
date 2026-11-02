'use client';

import Link from 'next/link';
import { BrandMark } from './brand-mark';
import { DesktopNav, MobileNav, type NavItem } from './mobile-nav';
import { Button } from '@/components/ui/button';

const links: NavItem[] = [
  { href: '/questions', label: 'Questions', match: 'prefix' },
  { href: '/news', label: 'News', match: 'prefix' },
  { href: '/documents', label: 'PDFs', match: 'prefix' },
];

export function MarketingHeader() {
  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--line)]/80 bg-[var(--bg)]/90 backdrop-blur-md"
      style={{ ['--header-h' as string]: '64px' }}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-6">
        <BrandMark />
        <DesktopNav items={links} />
        <div className="hidden items-center gap-2 md:flex">
          <Link href="/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Start free trial</Button>
          </Link>
        </div>
        <MobileNav
          items={links}
          trailing={
            <>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button className="w-full">Start free trial</Button>
              </Link>
            </>
          }
        />
      </div>
    </header>
  );
}
