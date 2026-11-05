'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { meQueryKey } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser } from '@/lib/api/types';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [whatsappNumber, setWhatsapp] = useState('+880');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<{ user: MeUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ whatsappNumber, password }),
        skipRefresh: true,
      });
      qc.setQueryData(meQueryKey, result.user);
      const next = searchParams.get('next') || '/home';
      router.push(next.startsWith('/') ? next : '/home');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="motion-rise space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
          Sign in with your WhatsApp number.
        </p>
      </div>
      <Surface className="p-6 sm:p-7">
        <form onSubmit={onSubmit} className="space-y-4">
          <Field>
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <Input
              id="whatsapp"
              value={whatsappNumber}
              onChange={(e) => setWhatsapp(e.target.value)}
              autoComplete="username"
              required
            />
          </Field>
          <Field>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </Surface>
      <p className="text-sm text-[var(--muted)]">
        New here?{' '}
        <Link
          href="/register"
          className="font-semibold text-[var(--ink)] underline-offset-2 hover:underline"
        >
          Create account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="py-10 text-sm text-[var(--muted)]">Loading…</p>}>
      <LoginForm />
    </Suspense>
  );
}
