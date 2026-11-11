'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookMarked,
  BookOpen,
  FileText,
  Home,
  LayoutDashboard,
  Newspaper,
  UserRound,
} from 'lucide-react';
import { BrandMark } from './brand-mark';
import { cn } from '@/lib/utils';
import { useMe } from '@/features/auth/use-auth';

const items = [
  { href: '/home', label: 'Dashboard', icon: Home, match: 'exact' as const },
  { href: '/questions', label: 'Question bank', icon: BookOpen, match: 'prefix' as const },
  { href: '/documents', label: 'PDFs', icon: FileText, match: 'prefix' as const },
  { href: '/bookmarks', label: 'Saved', icon: BookMarked, match: 'prefix' as const },
  { href: '/news', label: 'News', icon: Newspaper, match: 'prefix' as const },
  { href: '/profile', label: 'Profile', icon: UserRound, match: 'prefix' as const },
];

function isActive(pathname: string, href: string, match: 'exact' | 'prefix') {
  if (match === 'exact') return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--line)] bg-white">
      <div className="border-b border-[var(--line)] px-5 py-5">
        <BrandMark href="/home" />
        <p className="mt-2 text-[10px] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
          Study desk
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Study">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'motion-nav-indicator flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium',
                active
                  ? 'bg-[var(--highlight)] text-white'
                  : 'text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin ? (
          <Link
            href="/admin/dashboard"
            className="mt-2 flex items-center gap-2.5 rounded-[10px] border border-[var(--line)] px-3 py-2.5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Admin console
          </Link>
        ) : null}
      </nav>
    </aside>
  );
}
