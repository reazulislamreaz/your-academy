'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export type NavItem = { href: string; label: string; match?: 'exact' | 'prefix' };

function isActive(pathname: string, item: NavItem) {
  const href = item.href.split('#')[0] || '/';
  if (item.match === 'exact') return pathname === href;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNav({
  items,
  trailing,
}: {
  items: NavItem[];
  trailing?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>
      {open ? (
        <div
          id={panelId}
          className="fixed inset-x-0 top-[var(--header-h,64px)] bottom-0 z-40 border-t border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-lg)] motion-fade-in"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-[var(--radius)] px-3 py-3 text-base font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
                  isActive(pathname, item)
                    ? 'bg-[var(--highlight)] text-white'
                    : 'text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {trailing ? <div className="mt-6 flex flex-col gap-2">{trailing}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function DesktopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'motion-nav-indicator rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)] ease-[var(--ease-out)]',
              active
                ? 'bg-[var(--highlight)] text-white'
                : 'text-[var(--muted-strong)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
