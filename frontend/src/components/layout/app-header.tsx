'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Bookmark, Search } from 'lucide-react';
import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { TrialStatusChip } from '@/components/access/trial-status-chip';
import { LearnerThemeToggle } from '@/components/theme/learner-theme-toggle';
import { useLearnerTheme } from '@/components/theme/learner-theme-provider';
import { SearchField } from '@/components/ui/search-field';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { BrandMark } from './brand-mark';
import { LearnerMobileNav } from './learner-mobile-nav';
import { MessagesMenu } from './messages-menu';
import { UpdatesMenu } from './updates-menu';
import { UserMenu } from './user-menu';

/**
 * Learner top navbar — matches Student Dashboard reference:
 * logo · trial · Saved MCQ · search · notifications · messages · profile.
 */
function AppHeaderInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { theme } = useLearnerTheme();
  const onQuestions = pathname.startsWith('/questions');
  const [query, setQuery] = useState(() =>
    onQuestions ? (searchParams.get('q') ?? '') : '',
  );
  const debouncedQ = useDebouncedValue(query.trim(), 350);
  const skipNav = useRef(true);
  const searchRef = useRef<HTMLInputElement>(null);
  const inverseLogo = theme === 'dark';

  useEffect(() => {
    if (!onQuestions) return;
    const urlQ = searchParams.get('q') ?? '';
    if (urlQ !== debouncedQ) {
      skipNav.current = true;
      setQuery(urlQ);
    }
  }, [onQuestions, searchParams, debouncedQ]);

  useEffect(() => {
    if (skipNav.current) {
      skipNav.current = false;
      return;
    }
    const href = debouncedQ
      ? `/questions?q=${encodeURIComponent(debouncedQ)}`
      : '/questions';
    if (onQuestions) {
      const current = searchParams.get('q') ?? '';
      if (current === debouncedQ) return;
      // Preserve other filters when only the search term changes.
      const sp = new URLSearchParams(searchParams.toString());
      if (debouncedQ) sp.set('q', debouncedQ);
      else sp.delete('q');
      const qs = sp.toString();
      router.replace(qs ? `/questions?${qs}` : '/questions', { scroll: false });
      return;
    }
    if (debouncedQ) {
      router.push(href);
    }
  }, [debouncedQ, onQuestions, router, searchParams]);

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
      className="ya-glass sticky top-0 z-30 flex h-[var(--header-h,4.5rem)] shrink-0 items-center gap-2 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] px-3 pt-[env(safe-area-inset-top,0px)] sm:gap-4 sm:px-5 lg:px-6"
      style={{ boxShadow: 'var(--shadow-header)' } as CSSProperties}
    >
      <div className="flex min-w-0 shrink-0 items-center gap-2.5 sm:gap-4">
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
        <TrialStatusChip className="hidden min-[480px]:inline-flex" />
      </div>

      <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2.5 md:gap-3">
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
          className="flex size-11 items-center justify-center rounded-[12px] border border-[var(--line)] bg-[var(--bg-muted)] text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--ink)] sm:hidden"
        >
          <Search className="size-[18px]" aria-hidden strokeWidth={1.75} />
        </Link>

        <div
          role="search"
          className="hidden min-w-0 sm:block sm:w-[11.5rem] md:w-[13.5rem] lg:w-[15rem]"
        >
          <label htmlFor="app-header-search" className="sr-only">
            Search questions
          </label>
          <SearchField
            id="app-header-search"
            inputRef={searchRef}
            value={query}
            onChange={setQuery}
            placeholder="Search questions…"
            aria-label="Search questions"
            variant="header"
          />
        </div>

        <div className="hidden sm:block">
          <UpdatesMenu />
        </div>
        <div className="hidden sm:block">
          <MessagesMenu />
        </div>
        <div className="hidden sm:block">
          <LearnerThemeToggle className="rounded-[12px] border-[var(--line)] bg-[var(--bg-muted)] shadow-none" />
        </div>
        <div className="hidden sm:block">
          <UserMenu variant="header" />
        </div>
        <LearnerMobileNav />
      </div>
    </header>
  );
}

export function AppHeader() {
  return (
    <Suspense
      fallback={
        <header
          className="ya-glass sticky top-0 z-30 flex h-[var(--header-h,4.5rem)] shrink-0 items-center border-b border-[var(--glass-border)] bg-[var(--glass-bg)] px-3"
          style={{ boxShadow: 'var(--shadow-header)' } as CSSProperties}
        >
          <BrandMark href="/" markOnly className="[&_img]:h-8" />
        </header>
      }
    >
      <AppHeaderInner />
    </Suspense>
  );
}
