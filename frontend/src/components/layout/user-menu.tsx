'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useIsAdmin, useLogout, useMe } from '@/features/auth/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const me = useMe();
  const logout = useLogout();
  const isAdmin = useIsAdmin();

  if (me.isLoading) {
    return <Skeleton className={compact ? 'h-9 w-24' : 'h-10 w-28'} />;
  }

  if (!me.data) {
    return (
      <div className={compact ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
        <Link href="/login" className={compact ? 'w-full' : undefined}>
          <Button variant={compact ? 'outline' : 'ghost'} size="sm" className={compact ? 'w-full' : undefined}>
            Sign in
          </Button>
        </Link>
        <Link href="/register" className={compact ? 'w-full' : undefined}>
          <Button size="sm" className={compact ? 'w-full' : undefined}>
            Start free trial
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className={compact ? 'flex flex-col gap-2' : 'flex items-center gap-2'}>
      {!compact ? (
        <Link
          href="/profile"
          className="hidden max-w-[10rem] truncate text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] lg:inline"
          title={me.data.name}
        >
          {me.data.name}
        </Link>
      ) : (
        <p className="px-1 text-sm font-medium text-[var(--ink)]">{me.data.name}</p>
      )}
      {isAdmin ? (
        <Link href="/admin/dashboard" className={compact ? 'w-full' : undefined}>
          <Button variant="outline" size="sm" className={compact ? 'w-full' : undefined}>
            Admin
          </Button>
        </Link>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        className={compact ? 'w-full' : undefined}
        disabled={logout.isPending}
        onClick={() => logout.mutate()}
      >
        {logout.isPending ? 'Signing out…' : 'Sign out'}
      </Button>
    </div>
  );
}
