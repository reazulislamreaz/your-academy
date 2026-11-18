'use client';

import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
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
          'marketing-nav-action cursor-pointer rounded-full',
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

function MarketingSearchField({
  id,
  value,
  onChange,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('marketing-nav-search min-w-0', className)}>
      <label htmlFor={id} className="sr-only">
        Search exams
      </label>
      <SearchField
        id={id}
        name="exam-search"
        value={value}
        onChange={onChange}
        placeholder="Search exams…"
        aria-label="Search exams"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        enterKeyHint="search"
        variant="header"
      />
    </div>
  );
}

function MarketingNavLinks({ activeId }: { activeId: string | null }) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [pill, setPill] = useState({ x: 0, width: 0, ready: false });

  const syncPill = useCallback(() => {
    const nav = navRef.current;
    if (!nav || !activeId) {
      setPill((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    const el = itemRefs.current.get(activeId);
    if (!el) {
      setPill((prev) => (prev.ready ? { ...prev, ready: false } : prev));
      return;
    }
    const navRect = nav.getBoundingClientRect();
    const itemRect = el.getBoundingClientRect();
    const next = {
      x: itemRect.left - navRect.left + nav.scrollLeft,
      width: itemRect.width,
      ready: true,
    };
    setPill((prev) =>
      prev.x === next.x && prev.width === next.width && prev.ready === next.ready
        ? prev
        : next,
    );
  }, [activeId]);

  useLayoutEffect(() => {
    syncPill();
    const frame = window.requestAnimationFrame(() => syncPill());
    return () => window.cancelAnimationFrame(frame);
  }, [syncPill, activeId]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const onResize = () => syncPill();
    window.addEventListener('resize', onResize);
    nav.addEventListener('scroll', onResize, { passive: true });

    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(nav);
    for (const el of itemRefs.current.values()) ro?.observe(el);

    // Bangla/Latin font swap can change label widths after first paint.
    void document.fonts?.ready.then(() => syncPill());

    return () => {
      window.removeEventListener('resize', onResize);
      nav.removeEventListener('scroll', onResize);
      ro?.disconnect();
    };
  }, [syncPill]);

  return (
    <nav
      ref={navRef}
      className="marketing-nav-rail hidden min-w-0 justify-self-center xl:flex"
      aria-label="Primary"
    >
      <span
        aria-hidden
        className="marketing-nav-pill"
        style={{
          width: pill.width,
          opacity: pill.ready ? 1 : 0,
          transform: `translate3d(${pill.x}px, 0, 0)`,
        }}
      />
      {marketingNavItems.map((item) => {
        const active = activeId === item.id;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            ref={(node) => {
              if (node) itemRefs.current.set(item.id, node);
              else itemRefs.current.delete(item.id);
            }}
            className="marketing-nav-link"
          >
            {item.label}
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

  const mobileNavItems = marketingNavItems.map((item) => ({
    id: item.id,
    href: item.href,
    label: item.label,
    match: item.match,
  }));

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
      className="marketing-nav-bar sticky top-0 z-30 pt-[env(safe-area-inset-top,0px)]"
      style={{ '--header-h': '64px' } as CSSProperties}
      data-marketing-menubar
    >
      <div className="marketing-nav-shell mx-auto h-14 max-w-[var(--marketing-content-max)] px-3 sm:h-16 sm:px-6">
        <div className="flex shrink-0 items-center gap-2">
          <BrandMark markOnly className="shrink-0 lg:hidden [&_img]:h-8" priority />
          <BrandMark className="hidden shrink-0 lg:inline-flex [&_img]:h-10" priority />
        </div>

        {/* Desktop-only primary nav — never shown below xl (CSS must not force display). */}
        <MarketingNavLinks activeId={activeId} />

        <div className="marketing-nav-tools gap-1.5 sm:gap-2">
          <MarketingSearchField
            id="marketing-search"
            value={query}
            onChange={setQuery}
            className="hidden w-[13.5rem] xl:block 2xl:w-[16rem]"
          />

          <div className="hidden items-center gap-2 md:flex">
            {dashboardHref ? <DashboardNavButton href={dashboardHref} /> : null}
            {me.data ? <UserMenu variant="header" /> : <UserMenu loginOnly />}
          </div>

          <div className="flex items-center gap-1.5 md:hidden">
            {me.data ? (
              <UserMenu variant="header" />
            ) : (
              <Link href="/login" className="shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  className="marketing-nav-action cursor-pointer rounded-full px-2.5 sm:px-3.5"
                >
                  <LogIn className="size-4" aria-hidden />
                  <span className="hidden min-[380px]:inline">Login</span>
                </Button>
              </Link>
            )}
            <MobileNav
              className="shrink-0"
              breakpointClassName=""
              title="Menu"
              items={mobileNavItems}
              activeId={activeId}
              leading={
                <MarketingSearchField
                  id="marketing-search-mobile"
                  value={query}
                  onChange={setQuery}
                  className="w-full"
                />
              }
              trailing={
                me.data ? (
                  dashboardHref ? (
                    <DashboardNavButton href={dashboardHref} fullWidth />
                  ) : null
                ) : (
                  <>
                    <Link href="/login" className="block w-full">
                      <Button variant="outline" className="marketing-nav-action w-full rounded-full">
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
            items={mobileNavItems}
            activeId={activeId}
            leading={
              <MarketingSearchField
                id="marketing-search-tablet"
                value={query}
                onChange={setQuery}
                className="w-full"
              />
            }
            trailing={
              me.data && dashboardHref ? (
                <DashboardNavButton href={dashboardHref} fullWidth />
              ) : !me.data ? (
                <>
                  <Link href="/login" className="block w-full">
                    <Button variant="outline" className="marketing-nav-action w-full rounded-full">
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
      </div>
    </header>
  );
}

export function MarketingHeader() {
  return (
    <Suspense
      fallback={
        <header
          className="marketing-nav-bar sticky top-0 z-30"
          style={{ '--header-h': '64px' } as CSSProperties}
        >
          <div className="marketing-nav-shell mx-auto h-16 max-w-[var(--marketing-content-max)] px-3 sm:px-6">
            <BrandMark markOnly className="shrink-0 [&_img]:h-8" priority />
            <div />
            <div />
          </div>
        </header>
      }
    >
      <MarketingHeaderInner />
    </Suspense>
  );
}
