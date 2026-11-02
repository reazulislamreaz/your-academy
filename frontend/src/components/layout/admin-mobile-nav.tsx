'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/questions', label: 'Questions' },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2 lg:hidden"
      aria-label="Admin sections"
    >
      {items.map((item) => {
        const active = pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium',
              active
                ? 'bg-[var(--bg-inverse)] text-white'
                : 'text-[var(--muted-strong)] hover:bg-[var(--bg-muted)]',
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
