'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const links = [
  { href: '/questions', label: 'Questions' },
  { href: '/bookmarks', label: 'Saved' },
  { href: '/news', label: 'News' },
  { href: '/profile', label: 'Profile' },
  { href: '/admin/dashboard', label: 'Admin' },
  { href: '/admin/questions', label: 'Manage MCQs' },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-6 py-6">
      <Link href="/" className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight">
        Your Academy
      </Link>
      <nav className="flex flex-wrap items-center gap-2 text-sm">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'rounded-full px-3 py-1.5 transition',
              pathname.startsWith(link.href)
                ? 'bg-[var(--ink)] text-white'
                : 'text-[var(--muted)] hover:bg-white/80 hover:text-[var(--ink)]',
            )}
          >
            {link.label}
          </Link>
        ))}
        <Link href="/login" className="rounded-full bg-[var(--accent)] px-4 py-1.5 font-semibold text-white">
          Sign in
        </Link>
      </nav>
    </header>
  );
}
