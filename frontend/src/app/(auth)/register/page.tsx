'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isValidWhatsapp } from '@your-academy/shared';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { AuthMobileTrialBanner } from '@/features/auth/auth-promo-panel';
import { PasswordField } from '@/features/auth/password-field';
import { PasswordStrength } from '@/features/auth/password-strength';
import { meQueryKey } from '@/features/auth/use-auth';
import {
  WhatsappField,
  toAuthWhatsappPayload,
} from '@/features/auth/whatsapp-field';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { MeUser } from '@/lib/api/types';

export default function RegisterPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: '',
    whatsappNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [touchedWa, setTouchedWa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouchedWa(true);
    setError(null);

    if (form.name.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (!isValidWhatsapp(form.whatsappNumber)) {
      setError('Please enter a valid Bangladeshi WhatsApp number.');
      return;
    }
    if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      setError('Password must be at least 8 characters and include a letter and a number.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const result = await apiFetch<{ user: MeUser }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          whatsappNumber: toAuthWhatsappPayload(form.whatsappNumber),
          password: form.password,
          ...(form.email.trim() ? { email: form.email.trim() } : {}),
        }),
        skipRefresh: true,
      });
      qc.setQueryData(meQueryKey, result.user);
      router.push('/onboarding');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form-stack space-y-3.5 lg:space-y-3">
      <div className="motion-rise space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[1.75rem]">
          Create Account
        </h1>
        <p className="text-sm text-[var(--muted-strong)]">Start your 7-day free trial today.</p>
      </div>

      <AuthMobileTrialBanner className="lg:hidden" />

      <Surface
        elevated
        className="motion-rise ya-panel-shine auth-card border-[var(--line)]/80 p-4 shadow-[var(--shadow)] sm:p-5"
        style={{ animationDelay: '50ms' }}
      >
        <form onSubmit={onSubmit} className="space-y-2.5 lg:space-y-2.5" noValidate>
          <Field className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="name"
              placeholder="Your full name"
              className="auth-input"
            />
          </Field>

          <Field className="space-y-1.5">
            <Label htmlFor="whatsapp">WhatsApp mobile number</Label>
            <WhatsappField
              id="whatsapp"
              value={form.whatsappNumber}
              onChange={(v) => {
                setForm((f) => ({ ...f, whatsappNumber: v }));
                if (!touchedWa && v.trim().length >= 10) setTouchedWa(true);
              }}
              touched={touchedWa}
            />
          </Field>

          <Field className="space-y-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              placeholder="you@example.com"
              className="auth-input"
            />
          </Field>

          <Field className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <PasswordField
              id="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
            />
            <PasswordStrength password={form.password} />
          </Field>

          <Field className="space-y-1.5">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <PasswordField
              id="confirmPassword"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
            />
            {form.confirmPassword && form.confirmPassword !== form.password ? (
              <p className="text-[0.6875rem] font-medium text-[var(--danger-fg)]" role="alert">
                Passwords do not match.
              </p>
            ) : null}
          </Field>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <Button
            type="submit"
            className="motion-press auth-submit mt-0.5 w-full"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Creating…' : 'Create Account'}
          </Button>

          <p className="text-center text-[0.6875rem] leading-snug text-[var(--muted)]">
            7-day free trial included. Full answers available during your trial.
          </p>
        </form>
      </Surface>

      <p className="motion-fade-in text-center text-sm text-[var(--muted-strong)]" style={{ animationDelay: '100ms' }}>
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
