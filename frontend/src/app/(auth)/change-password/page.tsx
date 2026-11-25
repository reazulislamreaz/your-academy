'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field, FieldHint } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { PasswordField } from '@/features/auth/password-field';
import { postLoginPath } from '@/features/auth/post-login-path';
import { meQueryKey, useLogout, useMe } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser } from '@/lib/api/types';
import { PASSWORD_POLICY_HINT, isValidPassword } from '@/lib/auth/password-policy';

/**
 * Forced password change after an Admin issued a temporary password. The API refuses
 * every other call (403 PASSWORD_CHANGE_REQUIRED) until this succeeds.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const me = useMe();
  const logout = useLogout();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mismatch = confirm.length > 0 && confirm !== next;
  const canSubmit = current.length > 0 && isValidPassword(next) && next === confirm;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ user: MeUser }>('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      qc.setQueryData(meQueryKey, result.user);
      router.replace(postLoginPath(result.user));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change the password');
    } finally {
      setLoading(false);
    }
  }

  const required = me.data?.mustChangePassword;

  return (
    <div className="space-y-6">
      <div className="motion-rise space-y-1.5">
        <h1 className="auth-welcome-title font-display text-[1.85rem] font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
          Set a new password
        </h1>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          {required
            ? 'You signed in with a temporary password from our support team. Choose your own password to continue.'
            : 'Choose a new password for your account.'}
        </p>
      </div>
      <Surface
        elevated
        className="motion-rise auth-card-ref p-5 sm:p-6"
        style={{ animationDelay: '60ms' }}
      >
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Field>
            <Label htmlFor="current-password">
              {required ? 'Temporary password' : 'Current password'}
            </Label>
            <PasswordField
              id="current-password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
              inputClassName="auth-input"
            />
          </Field>
          <Field>
            <Label htmlFor="new-password">New password</Label>
            <PasswordField
              id="new-password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
              inputClassName="auth-input"
            />
            <FieldHint className="text-xs">{PASSWORD_POLICY_HINT}</FieldHint>
          </Field>
          <Field>
            <Label htmlFor="confirm-password">Confirm new password</Label>
            <PasswordField
              id="confirm-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              aria-invalid={mismatch}
              required
              inputClassName="auth-input"
            />
            {mismatch ? (
              <FieldHint className="text-xs text-[var(--danger-fg)]">
                Passwords do not match.
              </FieldHint>
            ) : null}
          </Field>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Button
            type="submit"
            className="hero-cta-primary motion-press auth-submit auth-submit-gradient h-11 w-full"
            disabled={loading || !canSubmit}
            loading={loading}
          >
            {loading ? 'Saving…' : 'Save new password'}
          </Button>
        </form>
      </Surface>
      <p className="text-sm text-[var(--muted-strong)]">
        <button
          type="button"
          onClick={() => logout.mutate()}
          className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
        >
          Sign out instead
        </button>
      </p>
    </div>
  );
}
