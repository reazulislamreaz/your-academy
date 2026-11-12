'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import { ResetPasswordPageSkeleton } from '@/components/skeletons';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('Missing reset token. Open the link from your email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
        skipRefresh: true,
      });
      router.push('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Choose a new password</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)] sm:text-base">
          Use at least 8 characters with a letter and a number.
        </p>
      </div>
      <Surface elevated className="p-6 sm:p-7">
        <form onSubmit={onSubmit} className="space-y-4">
          {!token ? (
            <Alert variant="warning">
              No token in the URL. Request a new link from{' '}
              <Link
                href="/forgot-password"
                className="font-semibold underline-offset-2 hover:underline"
              >
                forgot password
              </Link>
              .
            </Alert>
          ) : null}
          <Field>
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          <Field>
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </Field>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Button type="submit" className="w-full" disabled={loading || !token}>
            {loading ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </Surface>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordPageSkeleton />}>
      <ResetForm />
    </Suspense>
  );
}
