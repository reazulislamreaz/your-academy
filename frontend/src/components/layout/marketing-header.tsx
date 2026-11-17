'use client';

import { Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { LayoutDashboard, LogIn } from 'lucide-react';
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
import { SearchField } from '@/components/ui/search-field';
import { useMe } from '@/features/auth/use-auth';
import { defaultPathForRole } from '@/lib/auth/role-routing';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

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
  const onBank = pathname.startsWith('/preli-question-bank');
  const [query, setQuery] = useState(() =>
    onBank ? (searchParams.get('q') ?? '') : '',
  );
  const debouncedQ = useDebouncedValue(query.trim(), 350);
  const skipNav = useRef(true);
  const wasOnBank = useRef(onBank);
  const lastSyncedUrlQ = useRef<string | null>(onBank ? (searchParams.get('q') ?? '') : null);

  const dashboardHref = me.data ? defaultPathForRole(me.data.role) : null;
  const activeId = resolveActiveMarketingNavId(pathname, searchParams.toString());

  // Entering/leaving the bank: sync or clear header search so filters don't leak.
  useEffect(() => {
    if (wasOnBank.current && !onBank) {
      skipNav.current = true;
      setQuery('');
      lastSyncedUrlQ.current = null;
    } else if (onBank) {
      const urlQ = searchParams.get('q') ?? '';
      if (!wasOnBank.current || lastSyncedUrlQ.current !== urlQ) {
        skipNav.current = true;
        setQuery(urlQ);
        lastSyncedUrlQ.current = urlQ;
      }
    }
    wasOnBank.current = onBank;
  }, [onBank, searchParams]);

  useEffect(() => {
    if (skipNav.current) {
      skipNav.current = false;
      return;
    }
    if (onBank) {
      const current = searchParams.get('q') ?? '';
      if (current === debouncedQ) return;
      // Preserve category / subcategory / year while updating header search.
      const sp = new URLSearchParams(searchParams.toString());
      if (debouncedQ) sp.set('q', debouncedQ);
      else sp.delete('q');
      const qs = sp.toString();
      router.replace(qs ? `/preli-question-bank?${qs}` : '/preli-question-bank', {
        scroll: false,
      });
      return;
    }
    // Off-bank: only navigate when the user intentionally types a new query.
    if (debouncedQ) {
      router.push(`/preli-question-bank?q=${encodeURIComponent(debouncedQ)}`);
    }
  }, [debouncedQ, onBank, router, searchParams]);
  return (
    <header
      className="ya-glass sticky top-0 z-30 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] pt-[env(safe-area-inset-top,0px)]"
      style={{ '--header-h': '64px' } as CSSProperties}
    >
      <div className="mx-auto flex h-14 w-full min-w-0 max-w-[var(--marketing-content-max)] items-center gap-2 px-3 sm:h-16 sm:gap-3 sm:px-6">
        <BrandMark markOnly className="shrink-0 lg:hidden [&_img]:h-8" priority />
        <BrandMark className="hidden shrink-0 lg:inline-flex [&_img]:h-10" priority />

        <MarketingNavLinks activeId={activeId} />

        <div className="ml-auto hidden min-w-0 w-[14rem] shrink-0 xl:block">
          <label htmlFor="marketing-search" className="sr-only">
            Search exams
          </label>
          <SearchField
            id="marketing-search"
            value={query}
            onChange={setQuery}
            placeholder="Search exams…"
            aria-label="Search exams"
            variant="header"
          />
        </div>

        <div className="ml-auto hidden shrink-0 items-center gap-2 md:flex xl:ml-0">
          {dashboardHref ? <DashboardNavButton href={dashboardHref} /> : null}
          {me.data ? <UserMenu variant="header" /> : <UserMenu loginOnly />}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1 md:hidden">
          {me.data ? (
            <UserMenu variant="header" />
          ) : (
            <Link href="/login" className="shrink-0">
              <Button size="sm" variant="ghost" className="cursor-pointer rounded-full px-2.5 sm:px-3.5">
                <LogIn className="size-4" aria-hidden />
                <span className="hidden min-[380px]:inline">Login</span>
              </Button>
            </Link>
          )}
          <MobileNav
            className="shrink-0"
            breakpointClassName=""
            title="Menu"
            items={marketingNavItems.map((item) => ({
              id: item.id,
              href: item.href,
              label: item.label,
              match: item.match,
            }))}
            activeId={activeId}
            leading={
              <div className="w-full">
                <label htmlFor="marketing-search-mobile" className="sr-only">
                  Search exams
                </label>
                <SearchField
                  id="marketing-search-mobile"
                  value={query}
                  onChange={setQuery}
                  placeholder="Search exams…"
                  aria-label="Search exams"
                  variant="header"
                />
              </div>
            }
            trailing={
              me.data ? (
                dashboardHref ? (
                  <DashboardNavButton href={dashboardHref} fullWidth />
                ) : null
              ) : (
                <>
                  <Link href="/login" className="block w-full">
                    <Button variant="outline" className="w-full rounded-full">
                      <LogIn className="size-4" aria-hidden />
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/register" className="block w-full">
                    <Button className="w-full rounded-full">Start free trial</Button>
                  </Link>
                  <Link href="/preli-question-bank" className="block w-full">
                    <Button variant="ghost" className="w-full rounded-full">
                      Browse question bank
                    </Button>
                  </Link>
                </>
              )
            }
          />
        </div>

        <MobileNav
          className="hidden shrink-0 md:block xl:hidden"
          breakpointClassName=""
          title="Menu"
          items={marketingNavItems.map((item) => ({
            id: item.id,
            href: item.href,
            label: item.label,
            match: item.match,
          }))}
          activeId={activeId}
          leading={
            <div className="w-full">
              <label htmlFor="marketing-search-tablet" className="sr-only">
                Search exams
              </label>
              <SearchField
                id="marketing-search-tablet"
                value={query}
                onChange={setQuery}
                placeholder="Search exams…"
                aria-label="Search exams"
                variant="header"
              />
            </div>
          }
          trailing={
            me.data && dashboardHref ? (
              <DashboardNavButton href={dashboardHref} fullWidth />
            ) : !me.data ? (
              <>
                <Link href="/login" className="block w-full">
                  <Button variant="outline" className="w-full rounded-full">
                    Sign in
                  </Button>
                </Link>
                <Link href="/register" className="block w-full">
                  <Button className="w-full rounded-full">Start free trial</Button>
                </Link>
              </>
            ) : null
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
          <div className="mx-auto flex h-16 w-full min-w-0 max-w-[var(--marketing-content-max)] items-center px-3 sm:px-6">
            <BrandMark markOnly className="shrink-0 [&_img]:h-8" priority />
          </div>
        </header>
      }
    >
      <MarketingHeaderInner />
    </Suspense>
  );
}
