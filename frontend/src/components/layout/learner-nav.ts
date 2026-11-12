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
  Target,
  Sparkles,
  UserRound,
  type LucideIcon,
} from 'lucide-react';

export type LearnerNavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  match?: 'exact' | 'prefix';
};

export type LearnerNavGroup = { title: string; items: LearnerNavLink[] };

/** Single source of truth for learner sidebar + mobile drawer IA. */
export const learnerNavGroups: LearnerNavGroup[] = [
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

export function learnerLinkActive(pathname: string, item: LearnerNavLink): boolean {
  const pathOnly = item.href.split('?')[0] || '/';
  if (item.match === 'exact') return pathname === pathOnly;
  if (pathOnly === '/questions') {
    return pathname === '/questions' || pathname.startsWith('/questions/');
  }
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}
