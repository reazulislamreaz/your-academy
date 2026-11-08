'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandMark } from './brand-mark';
import { MobileNav, type NavItem } from './mobile-nav';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils';

type HeaderNavItem = NavItem & { dropdown?: boolean };

const links: HeaderNavItem[] = [
  { href: '/', label: 'Home', match: 'exact' },
  { href: '/questions', label: 'Jobs', match: 'prefix', dropdown: true },
  { href: '/questions', label: 'MCQ Practice', match: 'prefix' },
  { href: '/documents', label: 'Job Solutions', match: 'prefix' },
  { href: '/news', label: 'Resources', match: 'prefix', dropdown: true },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
];

export function MarketingHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState('');

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/questions?q=${encodeURIComponent(q)}` : '/questions');
  };

  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 backdrop-blur-md"
      style={{ '--header-h': '72px' } as CSSProperties}
    >
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6">
        <BrandMark />
        <nav className="ml-2 hidden items-center gap-0.5 xl:flex" aria-label="Primary">
          {links.map((item) => {
            const active = item.label === 'Home' ? pathname === '/' : false;
            return (
              <Link
                key={`${item.label}-${item.href}`}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)]',
                  active
                    ? 'bg-[var(--highlight)] text-white'
                    : 'text-[var(--muted-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
                )}
              >
                {item.label}
                {item.dropdown ? <ChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden /> : null}
              </Link>
            );
          })}
        </nav>
        <form
          onSubmit={onSearch}
          role="search"
          className="ml-auto hidden min-w-0 flex-1 max-w-[14rem] items-center lg:flex"
        >
          <label htmlFor="marketing-search" className="sr-only">
            Search exams
          </label>
          <div className="relative w-full">
            <input
              id="marketing-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search exams..."
              className="h-10 w-full rounded-full border border-[var(--line)] bg-[var(--bg-muted)] pr-10 pl-4 text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--highlight)] focus:bg-white focus:shadow-[0_0_0_3px_var(--highlight-soft)] sm:text-sm"
            />
            <button
              type="submit"
              aria-label="Search"
              className="absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted)] transition-colors hover:bg-[var(--highlight-soft)] hover:text-[var(--highlight)]"
            >
              <Search className="h-4 w-4" />
            </button>
          </div>
        </form>
        <div className="hidden shrink-0 md:block">
          <UserMenu loginOnly />
        </div>
        <MobileNav items={links} trailing={<UserMenu compact />} />
      </div>
    </header>
  );
}
