'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandMark } from './brand-mark';
import { MobileNav, type NavItem } from './mobile-nav';
import { UserMenu } from './user-menu';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const links: NavItem[] = [
  { href: '/', label: 'Home', match: 'exact' },
  { href: '/questions?q=Preliminary', label: 'Prili Question Bank' },
  { href: '/questions?q=Written', label: 'Written Question Bank' },
  { href: '/questions', label: 'Exam', match: 'prefix' },
  { href: '/news', label: 'পত্রিকার গুরুত্বপূর্ণ কলাম', match: 'prefix' },
  { href: '/questions?q=Job', label: 'চাকরি' },
];

function isHomeActive(pathname: string, href: string, label: string) {
  if (label === 'Home') return pathname === '/';
  if (label === 'Exam') return pathname === '/questions' || pathname.startsWith('/questions/');
  if (href.startsWith('/news')) return pathname === '/news' || pathname.startsWith('/news/');
  return false;
}

function SearchField({
  id,
  query,
  setQuery,
  onSearch,
  className,
}: {
  id: string;
  query: string;
  setQuery: (v: string) => void;
  onSearch: (e: FormEvent) => void;
  className?: string;
}) {
  return (
    <form onSubmit={onSearch} role="search" className={className}>
      <label htmlFor={id} className="sr-only">
        Search exams
      </label>
      <div className="relative w-full">
        <input
          id={id}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search exams..."
          className="h-11 w-full rounded-full border border-[var(--line)] bg-[var(--bg-muted)] pr-11 pl-4 text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted-strong)] focus:border-[var(--highlight)] focus:bg-white focus:shadow-[0_0_0_3px_var(--highlight-soft)] sm:h-10 sm:text-sm"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute top-1/2 right-1 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[var(--muted-strong)] transition-colors hover:bg-[var(--highlight-soft)] hover:text-[var(--highlight)]"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

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
      <div className="mx-auto flex h-[72px] w-full max-w-[1280px] items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <BrandMark className="shrink-0" />
        <nav
          className="ml-1 hidden min-w-0 flex-1 items-center justify-center gap-0.5 xl:flex"
          aria-label="Primary"
        >
          {links.map((item) => {
            const active = isHomeActive(pathname, item.href, item.label);
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'inline-flex items-center whitespace-nowrap rounded-full px-3 py-2 text-[13px] font-semibold transition-colors duration-[var(--duration-fast)]',
                  active
                    ? 'bg-[var(--highlight)] text-white'
                    : 'text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <SearchField
          id="marketing-search"
          query={query}
          setQuery={setQuery}
          onSearch={onSearch}
          className="ml-auto hidden min-w-0 w-[11.5rem] shrink-0 items-center xl:flex"
        />
        <div className="ml-auto hidden shrink-0 md:block xl:ml-0">
          <UserMenu loginOnly />
        </div>
        <MobileNav
          className="ml-auto shrink-0 md:ml-0"
          items={links}
          leading={
            <SearchField
              id="marketing-search-mobile"
              query={query}
              setQuery={setQuery}
              onSearch={onSearch}
              className="w-full"
            />
          }
          trailing={
            <div className="flex flex-col gap-2">
              <div className="md:hidden">
                <UserMenu compact />
              </div>
              <Link href="/questions" className="md:hidden">
                <Button className="w-full rounded-full">Browse exams</Button>
              </Link>
            </div>
          }
        />
      </div>
    </header>
  );
}
