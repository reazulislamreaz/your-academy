'use client';

import { usePathname } from 'next/navigation';
import type { CSSProperties } from 'react';
import { TrialStatusChip } from '@/components/access/trial-status-chip';
import { BrandMark } from './brand-mark';
import { MobileNav, type NavItem } from './mobile-nav';
import { UpdatesMenu } from './updates-menu';
import { UserMenu } from './user-menu';
import { useMe } from '@/features/auth/use-auth';

const baseLinks: NavItem[] = [
  { href: '/home', label: 'Dashboard', match: 'exact' },
  { href: '/questions', label: 'Bank', match: 'prefix' },
  { href: '/quizzes', label: 'Quizzes', match: 'prefix' },
  { href: '/model-tests', label: 'Models', match: 'prefix' },
  { href: '/exams', label: 'Exams', match: 'prefix' },
  { href: '/results', label: 'Results', match: 'prefix' },
  { href: '/profile', label: 'Profile', match: 'prefix' },
];

const pageMeta: Record<string, { title: string; subtitle: string }> = {
  '/home': {
    title: 'Dashboard',
    subtitle: 'Your practice pulse, recent results, and next steps.',
  },
  '/questions': {
    title: 'Question bank',
    subtitle: 'Browse, filter, and check answers in the question bank.',
  },
  '/subjects': {
    title: 'Subject practice',
    subtitle: 'Topics, MCQs, and subject quizzes by curriculum area.',
  },
  '/quizzes': {
    title: 'Quiz center',
    subtitle: 'Daily, subject, and topic quizzes with scored review.',
  },
  '/daily-quiz': {
    title: 'Daily quiz',
    subtitle: 'A short published set to keep your streak going.',
  },
  '/model-tests': {
    title: 'Model tests',
    subtitle: 'Timed mocks with negative marking where configured.',
  },
  '/exams': {
    title: 'Govt job prep',
    subtitle: 'BCS, bank, teacher, NTRCA, and other exam tracks.',
  },
  '/previous-year': {
    title: 'Previous-year style',
    subtitle: 'Demo collections inspired by previous-year workflows.',
  },
  '/practice': {
    title: 'Practice set',
    subtitle: 'Answer questions, watch the timer, then submit.',
  },
  '/results': {
    title: 'My results',
    subtitle: 'Scores and answer review from your attempts.',
  },
  '/documents': {
    title: 'Study resources',
    subtitle: 'Published PDFs you can open and save for later.',
  },
  '/bookmarks': {
    title: 'Saved questions',
    subtitle: 'Questions and papers you bookmarked while studying.',
  },
  '/news': {
    title: 'News & updates',
    subtitle: 'Exam notices and updates from Your Academy.',
  },
  '/onboarding': {
    title: 'My topics',
    subtitle: 'Pick subjects so recommendations stay relevant.',
  },
  '/profile': {
    title: 'Profile & settings',
    subtitle: 'Account details, membership, and password.',
  },
};

function resolveMeta(pathname: string) {
  if (pathname.startsWith('/questions/')) {
    return { title: 'Practice question', subtitle: 'Select an option, then check your answer.' };
  }
  if (pathname.startsWith('/documents/')) {
    return { title: 'Document', subtitle: 'Open the paper and save it if you need it later.' };
  }
  if (pathname.startsWith('/news/')) {
    return { title: 'News', subtitle: 'Circular detail and study updates.' };
  }
  for (const [path, meta] of Object.entries(pageMeta)) {
    if (pathname === path || pathname.startsWith(`${path}/`)) return meta;
  }
  return pageMeta['/home']!;
}

/** Compact top bar — title left, utilities right. */
export function AppHeader() {
  const me = useMe();
  const pathname = usePathname();
  const meta = resolveMeta(pathname);
  const links =
    me.data?.role === 'ADMIN'
      ? [...baseLinks, { href: '/admin/dashboard', label: 'Admin' }]
      : baseLinks;

  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-white/90 px-3 backdrop-blur-md sm:h-16 sm:gap-3 sm:px-6 sm:[--header-h:4rem]"
      style={{ '--header-h': '3.5rem' } as CSSProperties}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="lg:hidden">
          <BrandMark href="/home" markOnly />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">{meta.title}</p>
          <p className="hidden truncate text-xs text-[var(--muted)] md:block">{meta.subtitle}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <div className="hidden min-[400px]:block">
          <TrialStatusChip />
        </div>
        <UpdatesMenu />
        <div className="hidden md:block">
          <UserMenu />
        </div>
        <MobileNav items={links} trailing={<UserMenu compact />} breakpointClassName="lg:hidden" />
      </div>
    </header>
  );
}
