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
import { usePathname, useSearchParams } from 'next/navigation';
import { LogIn } from 'lucide-react';
import Link from 'next/link';
import { BrandMark } from './brand-mark';
import { MobileNav } from './mobile-nav';
import { UserMenu } from './user-menu';
import { marketingNavItems, resolveActiveMarketingNavId } from './marketing-nav';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/auth/use-auth';

function MarketingNavLinks({ activeId }: { activeId: string | null }) {
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef(new Map<string, HTMLElement>());
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
      prev.x === next.x && prev.width === next.width && prev.ready === next.ready ? prev : next,
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

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    ro?.observe(nav);
    for (const el of itemRefs.current.values()) ro?.observe(el);

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
        const setRef = (node: HTMLAnchorElement | null) => {
          if (node) itemRefs.current.set(item.id, node);
          else itemRefs.current.delete(item.id);
        };

        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            ref={setRef}
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
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const me = useMe();
  const activeId = resolveActiveMarketingNavId(pathname, searchParams.toString());

  const mobileNavItems = marketingNavItems.map((item) => ({
    id: item.id,
    href: item.href,
    label: item.label,
    match: item.match,
  }));

  return (
    <header
      className="marketing-nav-bar sticky top-0 z-30 shrink-0 pt-[env(safe-area-inset-top,0px)]"
      style={
        {
          '--header-h': '64px',
          // Used by MarketingShell main min-height so short pages keep footer below the fold.
          '--marketing-header-offset': 'calc(4.5rem + env(safe-area-inset-top, 0px))',
        } as CSSProperties
      }
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
          <div className="hidden items-center gap-2 md:flex">
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
                  className="marketing-nav-action min-h-11 cursor-pointer rounded-full px-2.5 sm:px-3.5"
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
              trailing={
                me.data ? null : (
                  <>
                    <Link href="/login" className="block w-full">
                      <Button
                        variant="outline"
                        className="marketing-nav-action w-full rounded-full"
                      >
                        <LogIn className="size-4" aria-hidden />
                        Sign in
                      </Button>
                    </Link>
                    <Link href="/register" className="block w-full">
                      <Button className="w-full rounded-full">Create free account</Button>
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
            trailing={
              !me.data ? (
                <>
                  <Link href="/login" className="block w-full">
                    <Button variant="outline" className="marketing-nav-action w-full rounded-full">
                      Sign in
                    </Button>
                  </Link>
                  <Link href="/register" className="block w-full">
                    <Button className="w-full rounded-full">Create free account</Button>
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
          className="marketing-nav-bar sticky top-0 z-30 shrink-0"
          style={
            {
              '--header-h': '64px',
              '--marketing-header-offset': 'calc(4.5rem + env(safe-area-inset-top, 0px))',
            } as CSSProperties
          }
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
