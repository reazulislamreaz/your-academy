'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bookmark, Search } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { TrialStatusChip } from '@/components/access/trial-status-chip';
import { LearnerThemeToggle } from '@/components/theme/learner-theme-toggle';
import { useLearnerTheme } from '@/components/theme/learner-theme-provider';
import { BrandMark } from './brand-mark';
import { LearnerMobileNav } from './learner-mobile-nav';
import { MessagesMenu } from './messages-menu';
import { UpdatesMenu } from './updates-menu';
import { UserMenu } from './user-menu';

/**
 * Learner top navbar — matches Student Dashboard reference:
 * logo · trial · Saved MCQ · search · notifications · messages · profile.
 */
export function AppHeader() {
  const router = useRouter();
  const { theme } = useLearnerTheme();
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const inverseLogo = theme === 'dark';

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
      className="sticky top-0 z-30 flex h-[var(--header-h,4.5rem)] shrink-0 items-center gap-3 border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 sm:gap-4 sm:px-5 lg:px-6"
      style={{ boxShadow: 'var(--shadow-header)' } as CSSProperties}
    >
      {/* Left: logo + trial */}
      <div className="flex min-w-0 shrink-0 items-center gap-3 sm:gap-4">
        <BrandMark
          href="/"
          markOnly
          inverse={inverseLogo}
          className="lg:hidden [&_img]:h-8"
        />
        <BrandMark
          href="/"
          inverse={inverseLogo}
          className="hidden lg:inline-flex [&_img]:h-10"
        />
        <TrialStatusChip className="hidden min-[400px]:inline-flex" />
      </div>

      {/* Right utilities */}
      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-2.5 md:gap-3">
        <Link
          href="/bookmarks"
          className="hidden h-10 items-center gap-2 rounded-full border border-[var(--line-strong)] bg-[var(--bg-muted)] px-3.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-soft)] md:inline-flex"
        >
          <Bookmark
            className="size-4 shrink-0 text-[var(--ink-soft)]"
            aria-hidden
            strokeWidth={2}
          />
          <span className="hidden lg:inline">Saved MCQ</span>
        </Link>

        <Link
          href="/questions"
          aria-label="Search questions"
          className="flex size-10 items-center justify-center rounded-[12px] border border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--ink)] sm:hidden"
        >
          <Search className="size-[18px]" aria-hidden strokeWidth={1.75} />
        </Link>

        <form
          onSubmit={onSearch}
          role="search"
          className="hidden min-w-0 sm:block sm:w-[11.5rem] md:w-[13.5rem] lg:w-[15rem]"
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
              placeholder="Search..."
              className="h-10 w-full rounded-full border border-[var(--line)] bg-[var(--bg-muted)] pr-3 pl-9 text-sm text-[var(--ink)] outline-none transition-[border-color,background-color,box-shadow] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:bg-[var(--bg-elevated)] focus:shadow-[var(--focus-ring)]"
            />
          </div>
        </form>

        <UpdatesMenu />
        <div className="hidden sm:block">
          <MessagesMenu />
        </div>
        <LearnerThemeToggle className="rounded-[12px] border-[var(--line)] bg-[var(--bg-muted)] shadow-none" />
        <div className="hidden md:block">
          <UserMenu variant="header" />
        </div>
        <LearnerMobileNav />
      </div>
    </header>
  );
}
