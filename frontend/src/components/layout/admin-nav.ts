import {
  Activity,
  ClipboardList,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  FolderTree,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Layers,
  MessageCircle,
  Newspaper,
  PenLine,
  ScrollText,
  Shapes,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

export type AdminNavGroup = {
  title: string;
  items: AdminNavItem[];
};

/** Flat list — used for active-route lookup. */
export const adminNavItems: AdminNavItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/support', label: 'Support', icon: MessageCircle },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
  { href: '/admin/audit', label: 'Audit', icon: ScrollText },
  { href: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { href: '/admin/question-imports', label: 'Bulk upload', shortLabel: 'Bulk', icon: FileSpreadsheet },
  {
    href: '/admin/written-question-imports',
    label: 'Written Question Bank',
    shortLabel: 'Written',
    icon: PenLine,
  },
  { href: '/admin/practice-sets', label: 'Practice sets', shortLabel: 'Practice', icon: ClipboardList },
  { href: '/admin/exams/upload', label: 'Guest exams', shortLabel: 'Exams', icon: ClipboardList },
  { href: '/admin/practice-attempts', label: 'Exam results', shortLabel: 'Results', icon: Activity },
  { href: '/admin/categories', label: 'Taxonomy', shortLabel: 'Tree', icon: FolderTree },
  {
    href: '/admin/question-bank-categories',
    label: 'Bank categories',
    shortLabel: 'Bank',
    icon: LayoutGrid,
  },
  {
    href: '/admin/written-bank-categories',
    label: 'Written Bank Categories',
    shortLabel: 'Written cats',
    icon: Layers,
  },
  {
    href: '/admin/topic-categories',
    label: 'Topic categories',
    shortLabel: 'Topics',
    icon: Shapes,
  },
  { href: '/admin/homepage', label: 'Homepage', icon: Home },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/documents', label: 'Documents', shortLabel: 'Docs', icon: FileText },
];

/** Grouped nav for sidebar + mobile drawer (enterprise IA). */
export const adminNavGroups: AdminNavGroup[] = [
  {
    title: 'Console',
    items: adminNavItems.filter((i) =>
      ['/admin/dashboard', '/admin/support', '/admin/users', '/admin/activity', '/admin/audit'].includes(
        i.href,
      ),
    ),
  },
  {
    title: 'Content',
    items: adminNavItems.filter((i) =>
      [
        '/admin/questions',
        '/admin/question-imports',
        '/admin/written-question-imports',
        '/admin/practice-sets',
        '/admin/exams/upload',
        '/admin/practice-attempts',
        '/admin/categories',
        '/admin/question-bank-categories',
        '/admin/written-bank-categories',
        '/admin/topic-categories',
        '/admin/homepage',
        '/admin/news',
        '/admin/documents',
      ].includes(i.href),
    ),
  },
];

export function isAdminNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
