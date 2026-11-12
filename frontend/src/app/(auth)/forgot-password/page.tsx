'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
        skipRefresh: true,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Reset password</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-strong)] sm:text-base">
          Enter the email on your account. If it matches, we send a reset link.
        </p>
      </div>
      <Surface elevated className="p-6 sm:p-7">
        {done ? (
          <Alert variant="success">
            If an account with that email exists, a reset link has been sent. Check your inbox — in
            local development the link is also logged by the API.
          </Alert>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <Field>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </Field>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </Surface>
      <p className="text-sm text-[var(--muted-strong)]">
        <Link
          href="/login"
          className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
