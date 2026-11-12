'use client';

import Link from 'next/link';
import { ChevronDown, LogIn, LogOut, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useIsAdmin, useLogout, useMe } from '@/features/auth/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function UserMenu({
  compact = false,
  loginOnly = false,
  variant = 'default',
}: {
  compact?: boolean;
  loginOnly?: boolean;
  /** Header chip with avatar + name + dropdown (app shell). */
  variant?: 'default' | 'header';
}) {
  const me = useMe();
  const logout = useLogout();
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

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
    return <Skeleton className={variant === 'header' ? 'h-10 w-36 rounded-full' : compact ? 'h-9 w-24' : 'h-10 w-28'} />;
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

  if (variant === 'header') {
    return (
      <div className="relative" ref={rootRef}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          aria-label="Account menu"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'flex max-w-[15rem] items-center gap-2.5 rounded-full py-1 pr-2.5 pl-1 text-left transition-colors hover:bg-[var(--bg-muted)]',
            open && 'bg-[var(--bg-muted)]',
          )}
        >
          {me.data.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- short-lived signed Cloudinary URL
            <img
              src={me.data.avatarUrl}
              alt=""
              width={40}
              height={40}
              decoding="async"
              className="size-10 shrink-0 rounded-full object-cover ring-1 ring-[var(--line)]"
            />
          ) : (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--brand-wash-strong)] text-[var(--ink)] ring-1 ring-[var(--line)]">
              <UserRound className="size-4" aria-hidden />
            </span>
          )}
          <span className="hidden min-w-0 truncate text-[15px] font-semibold text-[var(--ink)] sm:inline">
            {me.data.name}
          </span>
          <ChevronDown
            className={cn(
              'hidden size-4 shrink-0 text-[var(--muted)] transition-transform sm:block',
              open && 'rotate-180',
            )}
            aria-hidden
            strokeWidth={2}
          />
        </button>
        {open ? (
          <div
            id={panelId}
            className="motion-pop absolute right-0 z-40 mt-2 w-52 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]"
          >
            <div className="border-b border-[var(--line)] px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">{me.data.name}</p>
              <p className="truncate text-xs text-[var(--muted-strong)]">{me.data.whatsappNumber}</p>
            </div>
            <div className="flex flex-col p-1.5">
              <Link
                href="/profile"
                className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--bg-muted)]"
                onClick={() => setOpen(false)}
              >
                Profile
              </Link>
              {isAdmin ? (
                <Link
                  href="/admin/dashboard"
                  className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--bg-muted)]"
                  onClick={() => setOpen(false)}
                >
                  Admin
                </Link>
              ) : null}
              <button
                type="button"
                disabled={logout.isPending}
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-medium text-[var(--highlight)] hover:bg-[var(--highlight-soft)] disabled:opacity-60"
                onClick={() => {
                  setOpen(false);
                  logout.mutate();
                }}
              >
                <LogOut className="size-3.5" aria-hidden />
                {logout.isPending ? 'Signing out…' : 'Sign out'}
              </button>
            </div>
          </div>
        ) : null}
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
