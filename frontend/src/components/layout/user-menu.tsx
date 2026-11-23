'use client';

import Link from 'next/link';
import { LogIn, LogOut, LayoutDashboard, UserCog, UserRound } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useIsStaff, useLogout, useMe } from '@/features/auth/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { defaultPathForRole } from '@/lib/auth/role-routing';
import { cn } from '@/lib/utils';
import { ROLE_LABELS, UserRole } from '@your-academy/shared';
import { UserAvatar } from './user-avatar';

function roleLabel(role: string): string {
  if (role === 'ADMIN' || role === 'MODERATOR') return ROLE_LABELS[role as UserRole];
  return 'Student';
}

/**
 * Authenticated account control: compact avatar trigger + dropdown with Logout.
 * Also handles guest login CTAs for marketing / mobile drawers.
 *
 * Header/avatar popup shows only Dashboard + Logout (DEC marketing chrome).
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
  const isStaff = useIsStaff();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const requestLogout = () => {
    setOpen(false);
    setLogoutOpen(true);
  };

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
          variant === 'header' || loginOnly ? 'size-11' : compact ? 'h-11 w-28' : 'h-11 w-28',
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
            Create account
          </Button>
        </Link>
      </div>
    );
  }

  const user = me.data;
  const dashboardHref = defaultPathForRole(user.role);
  const useAvatarMenu = variant === 'header' || loginOnly || !compact;

  const logoutDialog = (
    <ConfirmDialog
      open={logoutOpen}
      title="Sign out?"
      description="You will need to sign in again to access your dashboard, bookmarks, and practice tools."
      confirmLabel="Sign out"
      cancelLabel="Stay signed in"
      destructive
      reversible
      pending={logout.isPending}
      onCancel={() => {
        if (!logout.isPending) setLogoutOpen(false);
      }}
      onConfirm={() => logout.mutate()}
    />
  );

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
        <Link href={isStaff ? '/admin/account' : '/profile'}>
          <Button variant="outline" size="sm" className="w-full justify-start gap-2">
            {isStaff ? (
              <UserCog className="size-4" aria-hidden />
            ) : (
              <UserRound className="size-4" aria-hidden />
            )}
            {isStaff ? 'Account settings' : 'Profile'}
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-[var(--highlight)] hover:bg-[var(--highlight-soft)] hover:text-[var(--highlight)]"
          disabled={logout.isPending}
          onClick={requestLogout}
        >
          <LogOut className="size-4" aria-hidden />
          {logout.isPending ? 'Signing out…' : 'Logout'}
        </Button>
        {logoutDialog}
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
        aria-controls={open ? panelId : undefined}
        aria-label="Account menu"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex size-11 cursor-pointer items-center justify-center rounded-full',
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
            'user-menu-popover absolute z-50 w-52 overflow-hidden p-1.5',
            'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] shadow-[var(--shadow-lg)]',
            menuPlacement === 'top'
              ? 'bottom-full left-0 mb-2 origin-bottom-left'
              : 'top-full right-0 mt-2 origin-top-right',
          )}
        >
          <Link
            role="menuitem"
            href={dashboardHref}
            className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-muted)]"
            onClick={() => setOpen(false)}
          >
            <LayoutDashboard className="size-3.5 shrink-0" aria-hidden />
            Dashboard
          </Link>
          {isStaff ? (
            <Link
              role="menuitem"
              href="/admin/account"
              className="flex items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--bg-muted)]"
              onClick={() => setOpen(false)}
            >
              <UserCog className="size-3.5 shrink-0" aria-hidden />
              Account settings
            </Link>
          ) : null}
          <button
            type="button"
            role="menuitem"
            disabled={logout.isPending}
            className="flex w-full cursor-pointer items-center gap-2 rounded-[var(--radius-sm)] px-3 py-2.5 text-left text-sm font-semibold text-[var(--highlight)] transition-colors hover:bg-[var(--highlight-soft)] disabled:opacity-60"
            onClick={requestLogout}
          >
            <LogOut className="size-3.5 shrink-0" aria-hidden />
            {logout.isPending ? 'Signing out…' : 'Logout'}
          </button>
        </div>
      ) : null}
      {logoutDialog}
    </div>
  );
}
