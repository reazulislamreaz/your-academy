'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileQuestion,
  LayoutDashboard,
  Newspaper,
  FolderTree,
  FileText,
  ArrowLeft,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandMark } from './brand-mark';

const items = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree },
  { href: '/admin/news', label: 'News', icon: Newspaper },
  { href: '/admin/documents', label: 'Documents', icon: FileText },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-[var(--bg-inverse)] text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <BrandMark inverse href="/admin/dashboard" />
        <p className="mt-2 text-[10px] font-semibold tracking-[0.16em] text-white/45 uppercase">
          Control room
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Admin">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'motion-nav-indicator flex items-center gap-2.5 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium',
                active
                  ? 'bg-[var(--highlight)] text-[var(--highlight-fg)]'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3">
        <Link
          href="/questions"
          className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-white/60 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>
      </div>
    </aside>
  );
}
