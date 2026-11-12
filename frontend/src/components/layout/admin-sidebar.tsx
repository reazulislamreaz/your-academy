'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLogout, useMe } from '@/features/auth/use-auth';
import { BrandMark } from './brand-mark';
import { adminNavItems } from './admin-nav';
import { Button } from '@/components/ui/button';

export function AdminSidebar() {
  const pathname = usePathname();
  const me = useMe();
  const logout = useLogout();

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col bg-[var(--bg-inverse)] text-white shadow-[var(--shadow)]">
      <div className="border-b border-white/10 px-5 py-5">
        <BrandMark inverse href="/admin/dashboard" />
        <p className="mt-2 text-xs font-semibold tracking-[0.14em] text-white/75 uppercase">
          Admin console
        </p>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3" aria-label="Admin">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'motion-nav-indicator flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-sm font-medium',
                active
                  ? 'bg-[var(--highlight)] text-[var(--highlight-fg)] shadow-sm'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-4 w-4 shrink-0 opacity-90" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-2 border-t border-white/10 p-3">
        {me.data ? (
          <p className="truncate px-3 text-xs text-white/50" title={me.data.name}>
            Signed in as <span className="font-medium text-white/80">{me.data.name}</span>
          </p>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-white/70 hover:bg-white/10 hover:text-white"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut className="h-4 w-4" />
          {logout.isPending ? 'Signing out…' : 'Sign out'}
        </Button>
      </div>
    </aside>
  );
}
