import {
  Activity,
  ClipboardList,
  FileQuestion,
  FileSpreadsheet,
  FileText,
  FolderTree,
  LayoutDashboard,
  Newspaper,
  ScrollText,
  Users,
  type LucideIcon,
} from 'lucide-react';

export type AdminNavItem = {
  href: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
};

/** Shared admin sidebar + mobile strip. */
export const adminNavItems: AdminNavItem[] = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/activity', label: 'Activity', icon: Activity },
  { href: '/admin/audit', label: 'Audit', icon: ScrollText },
  { href: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { href: '/admin/question-imports', label: 'Bulk upload', shortLabel: 'Bulk', icon: FileSpreadsheet },
  { href: '/admin/practice-sets', label: 'Practice sets', shortLabel: 'Practice', icon: ClipboardList },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/documents', label: 'Documents', shortLabel: 'Docs', icon: FileText },
];
