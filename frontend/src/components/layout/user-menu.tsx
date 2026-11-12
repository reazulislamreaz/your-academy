'use client';

import Link from 'next/link';
import { LogIn, LogOut, LayoutDashboard, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useIsAdmin, useLogout, useMe } from '@/features/auth/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { defaultPathForRole } from '@/lib/auth/role-routing';
import { cn } from '@/lib/utils';
import { UserAvatar } from './user-avatar';

function roleLabel(role: string): string {
  if (role === 'ADMIN') return 'Admin';
  return 'Student';
}

/**
 * Authenticated account control: compact avatar trigger + dropdown with Logout.
 * Also handles guest login CTAs for marketing / mobile drawers.
 */
export function UserMenu({
  compact = false,
  loginOnly = false,
  variant = 'default',
  /** Open the menu upward (sidebar footer). */
  menuPlacement = 'bottom',
}: {
  compact?: boolean;
  loginOnly?: boolean;
  /** Dashboard navbar: avatar-only trigger (preferred). */
  variant?: 'default' | 'header';
  menuPlacement?: 'bottom' | 'top';
}) {
  const me = useMe();
  const logout = useLogout();
  const isAdmin = useIsAdmin();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (me.isLoading) {
    return (
      <Skeleton
        className={cn(
          'shrink-0 rounded-full',
          variant === 'header' || loginOnly ? 'size-9' : compact ? 'h-9 w-24' : 'h-10 w-28',
        )}
      />
    );
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
          <Button
            variant={compact ? 'outline' : 'ghost'}
            size="sm"
            className={compact ? 'w-full' : undefined}
          >
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

  const user = me.data;
  const dashboardHref = defaultPathForRole(user.role);
  const useAvatarMenu = variant === 'header' || loginOnly || !compact;

  if (compact && !loginOnly) {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 px-1">
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">{user.name}</p>
            <p className="truncate text-xs text-[var(--muted-strong)]">{roleLabel(user.role)}</p>
          </div>
        </div>
        <Link href={dashboardHref}>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            <LayoutDashboard className="size-4" aria-hidden />
            Dashboard
          </Button>
        </Link>
        {!isAdmin ? (
          <Link href="/profile">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2">
              <UserRound className="size-4" aria-hidden />
              Profile
            </Button>
          </Link>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-[var(--highlight)] hover:bg-[var(--highlight-soft)] hover:text-[var(--highlight)]"
          disabled={logout.isPending}
          onClick={() => logout.mutate()}
        >
          <LogOut className="size-4" aria-hidden />
          {logout.isPending ? 'Signing out…' : 'Logout'}
        </Button>
      </div>
    );
  }

  if (!useAvatarMenu) {
    return null;
  }

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={panelId}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex size-9 cursor-pointer items-center justify-center rounded-full',
          'transition-[box-shadow,transform,opacity] duration-[var(--duration-fast)] ease-[var(--ease-out)]',
          'hover:opacity-90 hover:ring-2 hover:ring-[var(--accent)]/25 focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2',
          open && 'ring-2 ring-[var(--accent)]/30',
        )}
      >
        <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="md" />
      </button>

      {open ? (
        <div
          id={panelId}
          role="menu"
          aria-label="Account"
          className={cn(
            'motion-pop absolute z-50 w-60 overflow-hidden',
            'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]',
            menuPlacement === 'top' ? 'bottom-full left-0 mb-2' : 'top-full right-0 mt-2',
          )}
        >
          <div className="flex items-center gap-3 border-b border-[var(--line)] px-3.5 py-3">
            <UserAvatar name={user.name} avatarUrl={user.avatarUrl} size="lg" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">{user.name}</p>
              <p className="truncate text-xs text-[var(--muted-strong)]">{roleLabel(user.role)}</p>
            </div>
          </div>
          <div className="flex flex-col p-1.5">
            <Link
              role="menuitem"
              href={dashboardHref}
              className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--bg-muted)]"
              onClick={() => setOpen(false)}
            >
              <LayoutDashboard className="size-3.5 shrink-0" aria-hidden />
              Dashboard
            </Link>
            {!isAdmin ? (
              <Link
                role="menuitem"
                href="/profile"
                className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--ink)] hover:bg-[var(--bg-muted)]"
                onClick={() => setOpen(false)}
              >
                <UserRound className="size-3.5 shrink-0" aria-hidden />
                Profile
              </Link>
            ) : null}
            <button
              type="button"
              role="menuitem"
              disabled={logout.isPending}
              className="flex cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2 text-left text-sm font-semibold text-[var(--highlight)] hover:bg-[var(--highlight-soft)] disabled:opacity-60"
              onClick={() => {
                setOpen(false);
                logout.mutate();
              }}
            >
              <LogOut className="size-3.5 shrink-0" aria-hidden />
              {logout.isPending ? 'Signing out…' : 'Logout'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
