'use client';

import { Suspense, useState, type CSSProperties, type FormEvent } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, LogIn, Search } from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from './brand-mark';
import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';
import {
  marketingNavItems,
  resolveActiveMarketingNavId,
} from './marketing-nav';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/auth/use-auth';
import { defaultPathForRole } from '@/lib/auth/role-routing';

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
          className="h-10 w-full rounded-full border border-[var(--line)] bg-[var(--bg-muted)] pr-11 pl-4 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--muted-strong)] transition-[border-color,box-shadow,background-color] focus:border-[var(--accent)] focus:bg-white focus:shadow-[var(--focus-ring)]"
        />
        <button
          type="submit"
          aria-label="Search"
          className="absolute top-1/2 right-1 flex h-8 w-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-[var(--muted-strong)] transition-colors hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]"
        >
          <Search className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}

function DashboardNavButton({
  href,
  className,
  fullWidth = false,
  compact = false,
}: {
  href: string;
  className?: string;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  return (
    <Link href={href} className={className}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'cursor-pointer rounded-full',
          compact ? 'px-3' : 'px-4',
          fullWidth && 'w-full',
        )}
      >
        <LayoutDashboard className="size-4" aria-hidden />
        {compact ? <span className="sr-only">Dashboard</span> : 'Dashboard'}
      </Button>
    </Link>
  );
}

function MarketingNavLinks({ activeId }: { activeId: string | null }) {
  return (
    <nav
      className="ml-2 hidden min-w-0 flex-1 items-center justify-center gap-1 xl:flex"
      aria-label="Primary"
    >
      {marketingNavItems.map((item) => {
        const active = activeId === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'group relative inline-flex items-center whitespace-nowrap rounded-full px-3.5 py-2',
              'text-[13px] font-semibold tracking-tight',
              'transition-[color,background-color] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              active
                ? 'bg-[var(--accent-soft)] text-[var(--accent)]'
                : 'text-[var(--ink-soft)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink)]',
            )}
          >
            {item.label}
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute inset-x-4 -bottom-[6px] h-[3px] rounded-full bg-[var(--highlight)]',
                'transition-[opacity,transform] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                active
                  ? 'scale-x-100 opacity-100'
                  : 'scale-x-75 opacity-0 group-hover:opacity-50',
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}

function MarketingHeaderInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const me = useMe();
  const [query, setQuery] = useState('');

  const dashboardHref = me.data ? defaultPathForRole(me.data.role) : null;
  const activeId = resolveActiveMarketingNavId(pathname, searchParams.toString());

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(
      q ? `/preli-question-bank?q=${encodeURIComponent(q)}` : '/preli-question-bank',
    );
  };

  return (
    <header
      className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95 backdrop-blur-md"
      style={{ '--header-h': '64px' } as CSSProperties}
    >
      <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center gap-2 px-3 sm:gap-3 sm:px-6">
        {/* Compact mark on small screens; full lockup from lg up */}
        <BrandMark markOnly className="shrink-0 lg:hidden [&_img]:h-8" priority />
        <BrandMark className="hidden shrink-0 lg:inline-flex [&_img]:h-10" priority />

        <MarketingNavLinks activeId={activeId} />

        <SearchField
          id="marketing-search"
          query={query}
          setQuery={setQuery}
          onSearch={onSearch}
          className="ml-auto hidden min-w-0 w-[12rem] shrink-0 items-center xl:flex"
        />

        {/* Desktop / tablet actions */}
        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex xl:ml-0">
          {dashboardHref ? <DashboardNavButton href={dashboardHref} /> : null}
          <UserMenu loginOnly />
        </div>

        {/* Phone actions: one primary CTA + menu */}
        <div className="ml-auto flex shrink-0 items-center gap-1.5 md:hidden">
          {dashboardHref ? (
            <DashboardNavButton href={dashboardHref} compact />
          ) : (
            <Link href="/login">
              <Button size="sm" className="cursor-pointer rounded-full px-3.5">
                <LogIn className="size-4" aria-hidden />
                Login
              </Button>
            </Link>
          )}
          <MobileNav
            className="shrink-0"
            breakpointClassName=""
            items={marketingNavItems.map((item) => ({
              id: item.id,
              href: item.href,
              label: item.label,
              match: item.match,
            }))}
            activeId={activeId}
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
              me.data ? (
                <UserMenu compact />
              ) : (
                <Link href="/preli-question-bank">
                  <Button variant="outline" className="w-full rounded-full">
                    Browse question bank
                  </Button>
                </Link>
              )
            }
          />
        </div>

        {/* Tablet: keep hamburger for nav links until xl */}
        <MobileNav
          className="hidden shrink-0 md:block xl:hidden"
          breakpointClassName=""
          items={marketingNavItems.map((item) => ({
            id: item.id,
            href: item.href,
            label: item.label,
            match: item.match,
          }))}
          activeId={activeId}
          leading={
            <SearchField
              id="marketing-search-tablet"
              query={query}
              setQuery={setQuery}
              onSearch={onSearch}
              className="w-full"
            />
          }
        />
      </div>
    </header>
  );
}

export function MarketingHeader() {
  return (
    <Suspense
      fallback={
        <header
          className="sticky top-0 z-30 border-b border-[var(--line)] bg-white/95"
          style={{ '--header-h': '64px' } as CSSProperties}
        >
          <div className="mx-auto flex h-16 w-full max-w-[1280px] items-center px-3 sm:px-6">
            <BrandMark markOnly className="shrink-0 [&_img]:h-8" priority />
          </div>
        </header>
      }
    >
      <MarketingHeaderInner />
    </Suspense>
  );
}
