'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isValidWhatsapp } from '@your-academy/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { LoginPageSkeleton } from '@/components/skeletons';
import { PasswordField } from '@/features/auth/password-field';
import { postLoginPath } from '@/features/auth/post-login-path';
import { meQueryKey } from '@/features/auth/use-auth';
import {
  WhatsappField,
  toAuthWhatsappPayload,
} from '@/features/auth/whatsapp-field';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser } from '@/lib/api/types';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [whatsappNumber, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [touchedWa, setTouchedWa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouchedWa(true);
    setError(null);

    if (!isValidWhatsapp(whatsappNumber)) {
      setError('Please enter a valid Bangladeshi WhatsApp number.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{ user: MeUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          whatsappNumber: toAuthWhatsappPayload(whatsappNumber),
          password,
        }),
        skipRefresh: true,
      });
      qc.setQueryData(meQueryKey, result.user);
      router.push(postLoginPath(result.user, searchParams.get('next')));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form-stack space-y-4 lg:space-y-3.5">
      <div className="motion-rise space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[1.75rem]">
          Welcome Back
        </h1>
        <p className="text-sm text-[var(--muted-strong)]">
          Continue your journey towards exam success.
        </p>
      </div>

      <Surface
        elevated
        className="motion-rise ya-panel-shine auth-card border-[var(--line)]/80 p-4 shadow-[var(--shadow)] sm:p-5"
        style={{ animationDelay: '50ms' }}
      >
        <form onSubmit={onSubmit} className="space-y-3" noValidate>
          <Field className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp number</Label>
            <WhatsappField
              id="whatsapp"
              value={whatsappNumber}
              onChange={(v) => {
                setWhatsapp(v);
                if (!touchedWa && v.trim().length >= 10) setTouchedWa(true);
              }}
              touched={touchedWa}
              autoComplete="username"
            />
          </Field>
          <Field className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-[0.6875rem] font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordField
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </Field>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Button type="submit" className="motion-press auth-submit w-full" disabled={loading} loading={loading}>
            {loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
      </Surface>

      <p className="motion-fade-in text-center text-sm text-[var(--muted-strong)]" style={{ animationDelay: '100ms' }}>
        New to Your Academy?{' '}
        <Link
          href="/register"
          className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
        >
          Create Account
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageSkeleton />}>
      <LoginForm />
    </Suspense>
  );
}
