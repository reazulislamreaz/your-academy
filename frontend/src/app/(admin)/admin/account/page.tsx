'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, MailWarning } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@your-academy/shared';
import { AdminPage, AdminSection } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldHint } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { PasswordField } from '@/features/auth/password-field';
import { meQueryKey, useMe } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser } from '@/lib/api/types';
import { isValidPassword, PASSWORD_POLICY_HINT } from '@/lib/auth/password-policy';

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * Own account settings for every staff role (DEC-048). All endpoints act on the
 * signed-in user only (`/users/me`, `/auth/change-password`) — there is no way to
 * target another account from here.
 */
export default function AccountSettingsPage() {
  const me = useMe();
  const user = me.data;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Account"
        title="Account settings"
        description="Change your password and manage the email used for password reset."
      />

      {user ? (
        <>
          <Surface className="grid gap-4 p-5 sm:grid-cols-3 sm:p-6">
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">Name</p>
              <p className="mt-1 font-semibold text-[var(--ink)]">{user.name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">WhatsApp (sign-in)</p>
              <p className="mt-1 font-semibold text-[var(--ink)]">{user.whatsappNumber}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[var(--muted)]">Role</p>
              <p className="mt-1">
                <Badge variant="outline">{ROLE_LABELS[user.role as UserRole] ?? user.role}</Badge>
              </p>
            </div>
          </Surface>
          <div className="grid gap-6 lg:grid-cols-2">
            <ChangePasswordCard />
            <EmailCard user={user} />
          </div>
        </>
      ) : null}
    </AdminPage>
  );
}

function ChangePasswordCard() {
  const qc = useQueryClient();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const mismatch = confirmPassword.length > 0 && confirmPassword !== newPassword;

  const change = useMutation({
    mutationFn: () =>
      apiFetch<{ user: MeUser }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      }),
    onSuccess: (result) => {
      qc.setQueryData(meQueryKey, result.user);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError(null);
      setDone(true);
    },
    onError: (err) => {
      setDone(false);
      setError(messageOf(err, 'Could not change your password'));
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    if (newPassword !== confirmPassword) return setError('New passwords do not match.');
    if (!isValidPassword(newPassword)) return setError(PASSWORD_POLICY_HINT);
    if (newPassword === currentPassword) return setError('Choose a password you are not already using.');
    change.mutate();
  }

  return (
    <AdminSection title="Change password" description="Other devices are signed out after a change.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field>
          <Label htmlFor="current-password">Current password</Label>
          <PasswordField
            id="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field>
          <Label htmlFor="new-password">New password</Label>
          <PasswordField
            id="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            aria-describedby="new-password-hint"
            required
          />
          <FieldHint className="text-xs">
            <span id="new-password-hint">{PASSWORD_POLICY_HINT}</span>
          </FieldHint>
        </Field>
        <Field>
          <Label htmlFor="confirm-password">Confirm new password</Label>
          <PasswordField
            id="confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            aria-invalid={mismatch}
            required
          />
          {mismatch ? (
            <FieldHint className="text-xs text-[var(--highlight)]">Passwords do not match.</FieldHint>
          ) : null}
        </Field>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {done ? <Alert variant="success">Password updated.</Alert> : null}
        <Button
          type="submit"
          loading={change.isPending}
          disabled={change.isPending || !currentPassword || !newPassword || !confirmPassword}
        >
          Update password
        </Button>
      </form>
    </AdminSection>
  );
}

function EmailCard({ user }: { user: MeUser }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState(user.email ?? '');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const verified = Boolean(user.email && user.emailVerified);

  useEffect(() => {
    setEmail(user.email ?? '');
  }, [user.email]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch<MeUser>('/users/me', {
        method: 'PATCH',
        body: JSON.stringify({ email: email.trim() || null }),
      }),
    onSuccess: (next) => {
      qc.setQueryData(meQueryKey, next);
      setError(null);
      setNotice(
        next.email
          ? `We sent a confirmation link to ${next.email}. Open it to verify the address.`
          : 'Email removed.',
      );
    },
    onError: (err) => {
      setNotice(null);
      setError(messageOf(err, 'Could not update your email'));
    },
  });

  const resend = useMutation({
    mutationFn: () =>
      apiFetch<{ message: string }>('/users/me/email/verification', { method: 'POST' }),
    onSuccess: (res) => {
      setError(null);
      setNotice(res.message);
    },
    onError: (err) => {
      setNotice(null);
      setError(messageOf(err, 'Could not send the confirmation email'));
    },
  });

  const unchanged = email.trim().toLowerCase() === (user.email ?? '');

  return (
    <AdminSection title="Email" description="Used only for password-reset links. Each email can belong to one account.">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {user.email ? (
            <>
              <span className="font-medium break-all text-[var(--ink)]">{user.email}</span>
              {verified ? (
                <Badge variant="success" className="gap-1">
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  Verified
                </Badge>
              ) : (
                <Badge variant="warning" className="gap-1">
                  <MailWarning className="size-3.5" aria-hidden />
                  Not verified
                </Badge>
              )}
            </>
          ) : (
            <span className="text-[var(--muted-strong)]">No email added.</span>
          )}
        </div>

        {!verified ? (
          <Alert variant="warning">
            Without a verified email you can&rsquo;t reset a forgotten password yourself — an Admin
            would have to do it for you.
          </Alert>
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
          className="space-y-4"
          noValidate
        >
          <Field>
            <Label htmlFor="account-email">{user.email ? 'Change email' : 'Add email'}</Label>
            <Input
              id="account-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              placeholder="you@example.com"
            />
          </Field>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          {notice ? <Alert variant="success">{notice}</Alert> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" loading={save.isPending} disabled={save.isPending || unchanged}>
              {user.email ? 'Save and send confirmation' : 'Add and send confirmation'}
            </Button>
            {user.email && !verified ? (
              <Button
                type="button"
                variant="outline"
                loading={resend.isPending}
                disabled={resend.isPending}
                onClick={() => resend.mutate()}
              >
                Resend confirmation
              </Button>
            ) : null}
          </div>
        </form>
      </div>
    </AdminSection>
  );
}
