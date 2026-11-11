'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  BookMarked,
  BookOpen,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Newspaper,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { Suspense } from 'react';
import { BrandMark } from './brand-mark';
import { cn } from '@/lib/utils';
import { useMe } from '@/features/auth/use-auth';

type NavLink = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: 'exact' | 'prefix';
  /** Highlight only when this query param matches (e.g. model exams). */
  q?: string;
};

type NavGroup = { title: string; items: NavLink[] };

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { href: '/home', label: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
      { href: '/home#exam-history', label: 'Recent results', icon: History, match: 'exact' },
    ],
  },
  {
    title: 'Prepare',
    items: [
      { href: '/questions', label: 'MCQ practice', icon: BookOpen, match: 'prefix' },
      {
        href: '/questions?q=Model',
        label: 'Model exams',
        icon: ClipboardList,
        q: 'Model',
      },
      { href: '/onboarding', label: 'My topics', icon: Sparkles, match: 'prefix' },
    ],
  },
  {
    title: 'Library',
    items: [
      { href: '/documents', label: 'Previous papers', icon: FileText, match: 'prefix' },
      { href: '/bookmarks', label: 'Saved items', icon: BookMarked, match: 'prefix' },
      { href: '/news', label: 'News & circulars', icon: Newspaper, match: 'prefix' },
    ],
  },
  {
    title: 'Account',
    items: [{ href: '/profile', label: 'Profile & settings', icon: UserRound, match: 'prefix' }],
  },
];

function linkActive(
  pathname: string,
  searchQ: string | null,
  item: NavLink,
): boolean {
  if (item.href.includes('#')) {
    // Hash targets live on /home; keep Dashboard as the primary active item.
    return false;
  }
  const pathOnly = item.href.split('?')[0] || '/';
  if (item.q) {
    return (
      (pathname === '/questions' || pathname.startsWith('/questions/')) &&
      (searchQ ?? '').toLowerCase().includes(item.q.toLowerCase())
    );
  }
  if (pathOnly === '/questions') {
    // Don't mark Practice active when the Model exams filter is on.
    if ((searchQ ?? '').toLowerCase().includes('model')) return false;
    return pathname === '/questions' || pathname.startsWith('/questions/');
  }
  if (item.match === 'exact') return pathname === pathOnly;
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

function SidebarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchQ = searchParams.get('q');
  const me = useMe();
  const isAdmin = me.data?.role === 'ADMIN';

  return (
    <aside className="flex h-full w-[15.5rem] shrink-0 flex-col border-r border-[var(--line)] bg-white">
      <div className="flex h-16 shrink-0 items-center border-b border-[var(--line)] px-4">
        <BrandMark href="/home" />
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-3" aria-label="Study">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-2.5 pb-1.5 text-[10px] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              {group.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = linkActive(pathname, searchQ, item);
                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    onClick={(e) => {
                      if (!item.href.includes('#exam-history')) return;
                      if (pathname !== '/home') return;
                      e.preventDefault();
                      document
                        .getElementById('exam-history')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      window.history.replaceState(null, '', '/home#exam-history');
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm font-medium transition-colors duration-[var(--duration-fast)]',
                      active
                        ? 'bg-[var(--highlight-soft)] text-[var(--highlight)]'
                        : 'text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]',
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {isAdmin ? (
        <div className="border-t border-[var(--line)] p-3">
          <Link
            href="/admin/dashboard"
            className="flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
          >
            <Shield className="size-4 shrink-0" aria-hidden />
            Admin console
          </Link>
        </div>
      ) : null}
    </aside>
  );
}

export function AppSidebar() {
  return (
    <Suspense
      fallback={
        <aside className="flex h-full w-[15.5rem] shrink-0 flex-col border-r border-[var(--line)] bg-white">
          <div className="flex h-16 items-center border-b border-[var(--line)] px-4">
            <BrandMark href="/home" />
          </div>
        </aside>
      }
    >
      <SidebarNav />
    </Suspense>
  );
}
