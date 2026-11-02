'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileQuestion,
  LayoutDashboard,
  Newspaper,
  FolderTree,
  ArrowLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BrandMark } from './brand-mark';
import { Separator } from '@/components/ui/separator';

const items = [
  { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/questions', label: 'Questions', icon: FileQuestion },
  { href: '/admin/categories', label: 'Categories', icon: FolderTree, disabled: true },
  { href: '/admin/news', label: 'News', icon: Newspaper, disabled: true },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--bg-inverse)] text-white">
      <div className="px-5 py-5">
        <BrandMark className="text-white" href="/admin/dashboard" />
        <p className="mt-1 text-xs tracking-wide text-white/55 uppercase">Admin</p>
      </div>
      <Separator className="bg-white/10" />
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Admin">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          if (item.disabled) {
            return (
              <span
                key={item.href}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-white/35"
                title="Coming in a later phase"
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-[var(--highlight)] text-[var(--highlight-fg)]' : 'text-white/75 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-3">
        <Link
          href="/questions"
          className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to app
        </Link>
      </div>
    </aside>
  );
}
