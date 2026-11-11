'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookMarked,
  BookOpen,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Library,
  Newspaper,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { BrandMark } from './brand-mark';
import { cn } from '@/lib/utils';
import { useMe } from '@/features/auth/use-auth';

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: 'exact' | 'prefix';
};

/** QBookBD-inspired nav, mapped to Your Academy routes/features. */
const primaryNav: NavLink[] = [
  { href: '/home', label: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
  { href: '/questions', label: 'Practice', icon: BookOpen, match: 'prefix' },
  { href: '/questions', label: 'Question bank', icon: Library, match: 'prefix' },
  { href: '/documents', label: 'Previous papers', icon: FileText, match: 'prefix' },
  { href: '/questions?q=Model', label: 'Model exams', icon: ClipboardList },
  { href: '/home#exam-history', label: 'Exam history', icon: History, match: 'exact' },
  { href: '/bookmarks', label: 'My saved', icon: BookMarked, match: 'prefix' },
  { href: '/news', label: 'News & circulars', icon: Newspaper, match: 'prefix' },
  { href: '/onboarding', label: 'My topics', icon: Sparkles, match: 'prefix' },
  { href: '/profile', label: 'Profile', icon: UserRound, match: 'prefix' },
];

function isActive(pathname: string, href: string, match: 'exact' | 'prefix' = 'prefix') {
  const pathOnly = href.split('?')[0].split('#')[0] || '/';
  if (href.includes('#')) {
    return pathname === pathOnly;
  }
  if (match === 'exact') return pathname === pathOnly;
  // Avoid highlighting both Practice and Question bank the same way when possible —
  // both point at /questions; treat both as active on question routes (reference does similar).
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

export function AppSidebar() {
  const pathname = usePathname();
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';

  return (
    <aside className="flex h-full w-[16rem] shrink-0 flex-col border-r border-[var(--line)] bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--line)] px-4">
        <BrandMark href="/home" />
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2" aria-label="Study">
        <p className="px-2 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-[var(--muted)] uppercase">
          Menu
        </p>
        {primaryNav.map((item) => {
          const Icon = item.icon;
          // Distinguish Practice vs Question bank active state visually only by path —
          // both valid entry points to the bank.
          const active = isActive(pathname, item.href, item.match);
          const key = `${item.label}-${item.href}`;
          return (
            <Link
              key={key}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--highlight-soft)] text-[var(--highlight)]'
                  : 'text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {isAdmin ? (
        <div className="border-t border-[var(--line)] p-2">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
          >
            <LayoutDashboard className="size-4 shrink-0" />
            Admin console
          </Link>
        </div>
      ) : null}
    </aside>
  );
}
