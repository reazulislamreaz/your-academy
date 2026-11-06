'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { BrandMark } from './brand-mark';
import { DesktopNav, MobileNav, type NavItem } from './mobile-nav';
import { UserMenu } from './user-menu';

const links: NavItem[] = [
  { href: '/', label: 'Home', match: 'exact' },
  { href: '/questions', label: 'MCQ Practice', match: 'prefix' },
  { href: '/news', label: 'News', match: 'prefix' },
  { href: '/documents', label: 'PDFs', match: 'prefix' },
  { href: '/#how-trial-works', label: 'How it works' },
];

export function MarketingHeader() {
  const router = useRouter();
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
      <div className="mx-auto flex h-[72px] w-full max-w-7xl items-center gap-4 px-6">
        <BrandMark />
        <DesktopNav items={links} />
        <form
          onSubmit={onSearch}
          role="search"
          className="ml-auto hidden min-w-0 flex-1 max-w-xs items-center lg:flex"
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
