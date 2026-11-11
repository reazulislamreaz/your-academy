'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  BookMarked,
  BookOpen,
  Building2,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Library,
  Newspaper,
  Shield,
  Sparkles,
  Target,
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
};

type NavGroup = { title: string; items: NavLink[] };

const navGroups: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { href: '/home', label: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
      { href: '/results', label: 'My results', icon: History, match: 'prefix' },
      { href: '/profile', label: 'Profile & settings', icon: UserRound, match: 'prefix' },
    ],
  },
  {
    title: 'Prepare',
    items: [
      { href: '/questions', label: 'Question bank', icon: BookOpen, match: 'prefix' },
      { href: '/subjects', label: 'Subject practice', icon: Library, match: 'prefix' },
      { href: '/quizzes', label: 'Quiz center', icon: Sparkles, match: 'prefix' },
      { href: '/daily-quiz', label: 'Daily quiz', icon: Target, match: 'prefix' },
      { href: '/model-tests', label: 'Model tests', icon: ClipboardList, match: 'prefix' },
      { href: '/exams', label: 'Govt job prep', icon: Building2, match: 'prefix' },
      { href: '/previous-year', label: 'Previous-year style', icon: FileText, match: 'prefix' },
    ],
  },
  {
    title: 'Library',
    items: [
      { href: '/documents', label: 'Study resources', icon: FileText, match: 'prefix' },
      { href: '/bookmarks', label: 'Saved questions', icon: BookMarked, match: 'prefix' },
      { href: '/news', label: 'News & updates', icon: Newspaper, match: 'prefix' },
    ],
  },
];

function linkActive(pathname: string, item: NavLink): boolean {
  const pathOnly = item.href.split('?')[0] || '/';
  if (item.match === 'exact') return pathname === pathOnly;
  if (pathOnly === '/questions') {
    return pathname === '/questions' || pathname.startsWith('/questions/');
  }
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

function SidebarNav() {
  const pathname = usePathname();
  useSearchParams();
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
            <p className="px-2.5 pb-1.5 text-xs font-semibold tracking-[0.12em] text-[var(--muted-strong)] uppercase">
              {group.title}
            </p>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = linkActive(pathname, item);
                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    href={item.href}
                    className={cn(
                      'motion-nav-indicator flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm font-medium',
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
            className="motion-nav-indicator flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-sm font-medium text-[var(--ink-soft)] hover:bg-[var(--bg-muted)] hover:text-[var(--ink)]"
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
