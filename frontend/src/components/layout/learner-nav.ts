import {
  BookMarked,
  BookOpenText,
  CreditCard,
  Crown,
  FilePenLine,
  FileText,
  Folders,
  History,
  LayoutDashboard,
  Layers3,
  Sparkles,
  Timer,
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
      { href: '/packages', label: 'Packages', icon: Crown, match: 'prefix' },
      { href: '/billing', label: 'My Subscription', icon: CreditCard, match: 'prefix' },
    ],
  },
  {
    title: 'Learning',
    items: [
      { href: '/preli-questions', label: 'Preli Questions', icon: BookOpenText, match: 'prefix' },
      { href: '/written', label: 'Written Questions', icon: FilePenLine, match: 'prefix' },
      { href: '/topics', label: 'Topic-Based Questions', icon: Folders, match: 'prefix' },
    ],
  },
  {
    title: 'Practice',
    items: [
      { href: '/live-quizzes', label: 'Quiz', icon: Sparkles, match: 'prefix' },
      { href: '/live-model-tests', label: 'Model Test', icon: Layers3, match: 'prefix' },
      { href: '/preli-practice', label: 'Preli Practice', icon: Timer, match: 'prefix' },
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
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}
