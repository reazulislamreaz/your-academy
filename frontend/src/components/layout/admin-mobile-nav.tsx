'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const items = [
  { href: '/admin/dashboard', label: 'Overview' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/questions', label: 'Questions' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/news', label: 'News' },
  { href: '/admin/documents', label: 'Docs' },
];

export function AdminMobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="flex gap-1 overflow-x-auto overscroll-x-contain border-b border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden"
      aria-label="Admin sections"
    >
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium',
              active
                ? 'bg-[var(--highlight)] text-white'
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
