import {
  BookMarked,
  BookOpenText,
  ClipboardList,
  FilePenLine,
  FileText,
  Folders,
  History,
  LayoutDashboard,
  Layers3,
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
    title: 'Main',
    items: [
      { href: '/home', label: 'Dashboard', icon: LayoutDashboard, match: 'exact' },
      { href: '/profile', label: 'My Profile', icon: UserRound, match: 'prefix' },
    ],
  },
  {
    title: 'Practice & Learning',
    items: [
      { href: '/quizzes', label: 'Quiz', icon: Sparkles, match: 'prefix' },
      { href: '/live-quizzes', label: 'Exams', icon: ClipboardList, match: 'prefix' },
      { href: '/live-model-tests', label: 'Model Tests', icon: Layers3, match: 'prefix' },
      { href: '/preliminary', label: 'Preli Practice', icon: BookOpenText, match: 'prefix' },
      { href: '/written', label: 'Written Questions', icon: FilePenLine, match: 'prefix' },
      { href: '/topics', label: 'Topic-Based Questions', icon: Folders, match: 'prefix' },
    ],
  },
  {
    title: 'Library',
    items: [
      { href: '/results', label: 'My results', icon: History, match: 'prefix' },
      { href: '/bookmarks', label: 'Saved items', icon: BookMarked, match: 'prefix' },
      { href: '/documents', label: 'Study resources', icon: FileText, match: 'prefix' },
    ],
  },
];

export function learnerLinkActive(pathname: string, item: LearnerNavLink): boolean {
  const pathOnly = item.href.split('?')[0] || '/';
  if (item.match === 'exact') return pathname === pathOnly;
  if (pathOnly === '/questions') {
    return pathname === '/questions' || pathname.startsWith('/questions/');
  }
  // Avoid /topics matching /topics/sets incorrectly overlapping other prefixes —
  // prefix match is intentional for nested bank routes.
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}
