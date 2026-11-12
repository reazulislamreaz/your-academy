'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Search } from 'lucide-react';
import { useState, type CSSProperties, type FormEvent } from 'react';
import { TrialStatusChip } from '@/components/access/trial-status-chip';
import { BrandMark } from './brand-mark';
import { LearnerMobileNav } from './learner-mobile-nav';
import { UpdatesMenu } from './updates-menu';
import { UserMenu } from './user-menu';

/**
 * Learner utilities bar — logo, trial, saved MCQs, search, updates, profile.
 * No chat surface (product has none).
 */
export function AppHeader() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/questions?q=${encodeURIComponent(q)}` : '/questions');
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-[var(--line)] bg-white/95 px-3 backdrop-blur-md sm:h-16 sm:gap-3 sm:px-5 sm:[--header-h:4rem]"
      style={{ '--header-h': '3.5rem' } as CSSProperties}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        <BrandMark href="/home" markOnly className="lg:hidden" />
        <TrialStatusChip className="hidden min-[420px]:inline-flex" />
      </div>

      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2.5">
        <Link
          href="/bookmarks"
          className="hidden items-center gap-2 rounded-full bg-[var(--info-soft)] px-3 py-2 text-sm font-semibold text-[var(--ink)] transition-colors hover:brightness-95 md:inline-flex"
        >
          <Bookmark className="size-4 shrink-0" aria-hidden strokeWidth={2.25} />
          <span className="hidden lg:inline">Saved MCQ</span>
        </Link>

        <form onSubmit={onSearch} role="search" className="hidden min-w-0 flex-1 sm:block sm:max-w-[14rem] md:max-w-[18rem] lg:max-w-[22rem]">
          <label htmlFor="app-header-search" className="sr-only">
            Search questions
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted-strong)]"
              aria-hidden
            />
            <input
              id="app-header-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search..."
              className="h-10 w-full rounded-full border border-transparent bg-[var(--bg-muted)] pr-3 pl-9 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--line-strong)] focus:bg-white focus:shadow-[0_0_0_3px_var(--brand-wash)]"
            />
          </div>
        </form>

        <UpdatesMenu />
        <div className="hidden md:block">
          <UserMenu variant="header" />
        </div>
        <LearnerMobileNav />
      </div>
    </header>
  );
}
