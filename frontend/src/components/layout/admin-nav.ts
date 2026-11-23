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
  Share2,
  Shapes,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { canAccessAdminPath } from '@/lib/auth/admin-access';

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
  {
    href: '/admin/topic-question-imports',
    label: 'Topic Base Upload',
    shortLabel: 'Topics',
    icon: Shapes,
  },
  { href: '/admin/practice-sets', label: 'Practice sets', shortLabel: 'Practice', icon: ClipboardList },
  { href: '/admin/exams/upload', label: 'Guest exams', shortLabel: 'Quiz', icon: ClipboardList },
  {
    href: '/admin/model-tests/upload',
    label: 'Model Test',
    shortLabel: 'Model',
    icon: ClipboardList,
  },
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
  {
    href: '/admin/social-links',
    label: 'Social media links',
    shortLabel: 'Social',
    icon: Share2,
  },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/documents', label: 'Documents', shortLabel: 'Docs', icon: FileText },
  { href: '/admin/account', label: 'Account settings', shortLabel: 'Account', icon: UserCog },
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
        '/admin/topic-question-imports',
        '/admin/practice-sets',
        '/admin/exams/upload',
        '/admin/model-tests/upload',
        '/admin/practice-attempts',
        '/admin/categories',
        '/admin/question-bank-categories',
        '/admin/written-bank-categories',
        '/admin/topic-categories',
        '/admin/homepage',
        '/admin/social-links',
        '/admin/news',
        '/admin/documents',
      ].includes(i.href),
    ),
  },
  {
    title: 'Account',
    items: adminNavItems.filter((i) => i.href === '/admin/account'),
  },
];

/**
 * Sidebar / drawer groups visible to a role. Access comes from the route table in
 * `lib/auth/admin-access.ts` (backed by the shared permission map) — UX only;
 * the API enforces the same permissions.
 */
export function adminNavGroupsForRole(role: string | null | undefined): AdminNavGroup[] {
  return adminNavGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessAdminPath(role, item.href)),
    }))
    .filter((group) => group.items.length > 0);
}

export function isAdminNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
