'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { adminNavItems } from './admin-nav';

export function AdminMobileNav() {
  const pathname = usePathname();
  const scrollerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const active = scrollerRef.current?.querySelector('[aria-current="page"]');
    active?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }, [pathname]);

  return (
    <nav
      ref={scrollerRef}
      className="relative flex min-w-0 w-full max-w-full gap-1 overflow-x-auto overscroll-x-contain border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      aria-label="Admin sections"
    >
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--bg-elevated)] to-transparent"
        aria-hidden
      />
      {adminNavItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'motion-nav-indicator shrink-0 rounded-[var(--radius)] px-3 py-2 text-sm font-medium',
              active
                ? 'bg-[var(--bg-muted)] font-semibold text-[var(--ink)]'
                : 'text-[var(--muted)] hover:bg-[var(--brand-wash)] hover:text-[var(--ink-soft)]',
            )}
          >
            {item.shortLabel ?? item.label}
          </Link>
        );
      })}
    </nav>
  );
}
