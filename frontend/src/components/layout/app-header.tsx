'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Search } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { TrialStatusChip } from '@/components/access/trial-status-chip';
import { BrandMark } from './brand-mark';
import { LearnerMobileNav } from './learner-mobile-nav';
import { UpdatesMenu } from './updates-menu';
import { UserMenu } from './user-menu';

/**
 * Learner utilities bar — trial, saved MCQs, search, updates, profile.
 * No chat surface (product has none).
 */
export function AppHeader() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/questions?q=${encodeURIComponent(q)}` : '/questions');
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key !== 'k' && key !== 'f') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) {
        if (key === 'f') return;
      }
      e.preventDefault();
      if (searchRef.current) {
        searchRef.current.focus();
        searchRef.current.select();
      } else {
        router.push('/questions');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [router]);

  return (
    <header
      className="sticky top-0 z-30 flex h-[var(--header-h,3.75rem)] shrink-0 items-center gap-2 border-b border-[var(--line)] bg-[var(--bg)]/90 px-3 backdrop-blur-xl sm:gap-3 sm:px-5"
      style={{ boxShadow: 'var(--shadow-header)' } as CSSProperties}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
        <BrandMark href="/home" markOnly inverse className="lg:hidden [&_img]:h-8" />
        <TrialStatusChip className="hidden min-[420px]:inline-flex" />
      </div>

      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
        <Link
          href="/bookmarks"
          className="hidden items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 text-sm font-semibold text-[var(--ink)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--line-strong)] hover:bg-[var(--bg-muted)] md:inline-flex"
        >
          <Bookmark className="size-4 shrink-0 text-[var(--muted)]" aria-hidden strokeWidth={1.75} />
          <span className="hidden lg:inline">Saved MCQ</span>
        </Link>

        <Link
          href="/questions"
          aria-label="Search questions"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--muted)] shadow-[var(--shadow-sm)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)] sm:hidden"
        >
          <Search className="size-4" aria-hidden strokeWidth={1.75} />
        </Link>

        <form
          onSubmit={onSearch}
          role="search"
          className="hidden min-w-0 flex-1 sm:block sm:max-w-[14rem] md:max-w-[18rem] lg:max-w-[22rem]"
        >
          <label htmlFor="app-header-search" className="sr-only">
            Search questions
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
              strokeWidth={1.75}
            />
            <input
              ref={searchRef}
              id="app-header-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search questions…"
              className="h-10 w-full rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] pr-14 pl-9 text-sm text-[var(--ink)] outline-none transition-[border-color,background-color,box-shadow] placeholder:text-[var(--muted)] focus:border-[var(--accent-blue)] focus:bg-[var(--bg-muted)] focus:shadow-[0_0_0_3px_rgba(59,130,246,0.25)]"
            />
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-[var(--line)] bg-[var(--bg-muted)] px-1.5 py-0.5 text-[0.65rem] font-medium text-[var(--muted)] md:inline-block">
              ⌘K
            </kbd>
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
