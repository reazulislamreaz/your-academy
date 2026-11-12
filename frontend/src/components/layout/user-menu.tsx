'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsAdmin, useLogout, useMe } from '@/features/auth/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export function UserMenu({ compact = false, loginOnly = false }: { compact?: boolean; loginOnly?: boolean }) {
  const me = useMe();
  const logout = useLogout();
  const isAdmin = useIsAdmin();

  if (loginOnly && (me.isLoading || !me.data)) {
    return (
      <Link href="/login">
        <Button size="sm" className="rounded-full px-5">
          <LogIn className="h-4 w-4" />
          Login
        </Button>
      </Link>
    );
  }

  if (me.isLoading) {
    return <Skeleton className={compact ? 'h-9 w-24' : 'h-10 w-28'} />;
  }

  if (!me.data) {
    if (loginOnly) {
      return (
        <Link href="/login">
          <Button size="sm" className="rounded-full px-5">
            <LogIn className="h-4 w-4" />
            Login
          </Button>
        </Link>
      );
    }
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
          className="hidden max-w-[12rem] items-center gap-2 truncate text-sm font-medium text-[var(--ink-soft)] hover:text-[var(--ink)] lg:inline-flex"
          title={me.data.name}
        >
          {me.data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed Cloudinary URL
            <img
              src={me.data.avatarUrl}
              alt=""
              width={32}
              height={32}
              decoding="async"
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : null}
          <span className="truncate">{me.data.name}</span>
        </Link>
      ) : (
        <div className="flex items-center gap-2 px-1">
          {me.data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed Cloudinary URL
            <img
              src={me.data.avatarUrl}
              alt=""
              width={32}
              height={32}
              decoding="async"
              className="h-8 w-8 shrink-0 rounded-full object-cover"
            />
          ) : null}
          <p className="text-sm font-medium text-[var(--ink)]">{me.data.name}</p>
        </div>
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
