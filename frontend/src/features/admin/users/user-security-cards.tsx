'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { useState } from 'react';
import { AdminSection } from '@/components/admin/admin-page';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';

type ResetHistoryRow = {
  id: string;
  action: string;
  option: string | null;
  email: string | null;
  actor: { id: string; name: string; role: string } | null;
  createdAt: string;
};

type LoginRow = {
  loggedInAt: string;
  lastSeenAt: string;
  userAgent: string | null;
  ipAddress: string | null;
  active: boolean;
  endedReason: string | null;
};

const ACTION_LABELS: Record<string, string> = {
  ADMIN_PASSWORD_RESET_EMAIL: 'Reset email sent',
  ADMIN_PASSWORD_RESET_LINK: 'WhatsApp reset link created',
  ADMIN_PASSWORD_RESET_TEMPORARY: 'Temporary password set',
  STAFF_PASSWORD_RESET: 'Password set by Admin',
  PASSWORD_RESET_COMPLETED: 'User reset password via link',
  PASSWORD_CHANGE: 'User changed password',
};

const ENDED_LABELS: Record<string, string> = {
  REPLACED: 'Signed in on another device',
  LOGOUT: 'Signed out',
  ADMIN_LOGOUT: 'Force-logged out by Admin',
  ADMIN_RESET: 'Password reset by Admin',
  PASSWORD_CHANGE: 'Password changed',
  PASSWORD_RESET: 'Password reset',
  SUSPENDED: 'Account suspended',
  TOKEN_REUSE: 'Suspicious token reuse',
  EXPIRED: 'Expired',
};

/** "Mozilla/5.0 (Linux; Android 13; …) Chrome/120…" → "Chrome on Android". */
export function describeDevice(ua: string | null): string {
  if (!ua) return 'Unknown device';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\/|Opera/.test(ua)
      ? 'Opera'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Firefox\//.test(ua)
            ? 'Firefox'
            : /Safari\//.test(ua)
              ? 'Safari'
              : 'Browser';
  const os = /Android/.test(ua)
    ? 'Android'
    : /iPhone|iPad|iOS/.test(ua)
      ? 'iOS'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Mac OS X/.test(ua)
          ? 'macOS'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'unknown OS';
  return `${browser} on ${os}`;
}

export function PasswordResetHistoryCard({ userId }: { userId: string }) {
  const history = useQuery({
    queryKey: ['admin-user-reset-history', userId],
    queryFn: () => apiFetch<ResetHistoryRow[]>(`/admin/users/${userId}/password-reset/history`),
  });

  return (
    <AdminSection title="Password reset history" description="Admin actions and password changes for this account.">
      <Surface className="p-4 sm:p-5">
        {history.isLoading ? (
          <p className="text-sm text-[var(--muted-strong)]">Loading…</p>
        ) : history.error ? (
          <Alert variant="danger">Could not load the history.</Alert>
        ) : !history.data?.length ? (
          <p className="text-sm text-[var(--muted-strong)]">No password resets yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {history.data.map((row) => (
              <li key={row.id} className="py-2.5 text-sm first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--ink)]">{ACTION_LABELS[row.action] ?? row.action}</span>
                  <time className="text-xs text-[var(--muted-strong)]" dateTime={row.createdAt}>
                    {new Date(row.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="text-xs text-[var(--muted-strong)]">
                  {row.actor ? `By ${row.actor.name}` : 'By system'}
                  {row.email ? ` · ${row.email}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </AdminSection>
  );
}

export function RecentLoginsCard({ userId, canForceLogout }: { userId: string; canForceLogout: boolean }) {
  const qc = useQueryClient();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const logins = useQuery({
    queryKey: ['admin-user-logins', userId],
    queryFn: () => apiFetch<LoginRow[]>(`/admin/users/${userId}/logins`),
  });

  const forceLogout = async () => {
    try {
      const res = await apiFetch<{ sessionsRevoked: number }>(`/admin/users/${userId}/force-logout`, {
        method: 'POST',
      });
      setMessage({
        ok: true,
        text: res.sessionsRevoked ? 'Signed out of all devices.' : 'No active sessions to sign out.',
      });
      void qc.invalidateQueries({ queryKey: ['admin-user-logins', userId] });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : 'Could not sign the user out.' });
    }
  };

  return (
    <AdminSection
      title="Recent sign-ins"
      description="One device at a time: a new sign-in ends the previous one."
      actions={
        canForceLogout ? (
          <ConfirmButton
            size="sm"
            variant="outline"
            confirmTitle="Sign out of all devices?"
            confirmMessage="Every active session for this account ends immediately."
            confirmLabel="Sign out everywhere"
            reversible
            onConfirm={forceLogout}
          >
            <LogOut className="size-3.5" aria-hidden />
            Force logout
          </ConfirmButton>
        ) : null
      }
    >
      <Surface className="space-y-3 p-4 sm:p-5">
        {message ? <Alert variant={message.ok ? 'success' : 'danger'}>{message.text}</Alert> : null}
        {logins.isLoading ? (
          <p className="text-sm text-[var(--muted-strong)]">Loading…</p>
        ) : logins.error ? (
          <Alert variant="danger">Could not load sign-ins.</Alert>
        ) : !logins.data?.length ? (
          <p className="text-sm text-[var(--muted-strong)]">No sign-ins recorded yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {logins.data.map((row) => (
              <li key={row.loggedInAt} className="py-2.5 text-sm first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-[var(--ink)]">{describeDevice(row.userAgent)}</span>
                  {row.active ? (
                    <Badge variant="success">Active</Badge>
                  ) : (
                    <Badge variant="outline">{ENDED_LABELS[row.endedReason ?? 'EXPIRED'] ?? row.endedReason}</Badge>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-strong)]">
                  {new Date(row.loggedInAt).toLocaleString()}
                  {row.ipAddress ? ` · IP ${row.ipAddress}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Surface>
    </AdminSection>
  );
}
