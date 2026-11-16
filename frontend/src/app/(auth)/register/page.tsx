'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isValidWhatsapp } from '@your-academy/shared';
import { ArrowRight, Lock, MessageCircle, User } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
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
    <div className="auth-form-stack space-y-4 lg:space-y-4">
      <div className="motion-rise space-y-1.5">
        <h1 className="auth-welcome-title font-display text-[1.85rem] font-bold tracking-tight text-[var(--bg-inverse)] sm:text-[2rem]">
          Create Account
        </h1>
        <p className="text-sm text-[var(--muted-strong)]">
          Join Your Academy and start practicing today.
        </p>
      </div>

      <Surface
        elevated
        className="motion-rise auth-card-ref p-5 sm:p-6"
        style={{ animationDelay: '50ms' }}
      >
        <form onSubmit={onSubmit} className="space-y-3 lg:space-y-3" noValidate>
          <Field className="space-y-1.5">
            <Label htmlFor="name" className="auth-label-row">
              <User className="size-3.5 text-[var(--muted-strong)]" aria-hidden strokeWidth={2.25} />
              Full name
            </Label>
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
            <Label htmlFor="whatsapp" className="auth-label-row">
              <MessageCircle className="size-3.5 text-[#25D366]" aria-hidden strokeWidth={2.25} />
              WhatsApp mobile number
            </Label>
            <WhatsappField
              id="whatsapp"
              value={form.whatsappNumber}
              onChange={(v) => {
                setForm((f) => ({ ...f, whatsappNumber: v }));
                if (!touchedWa && v.trim().length >= 10) setTouchedWa(true);
              }}
              touched={touchedWa}
              showPhoneIcon
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
            <Label htmlFor="password" className="auth-label-row">
              <Lock className="size-3.5 text-[var(--muted-strong)]" aria-hidden strokeWidth={2.25} />
              Password
            </Label>
            <PasswordField
              id="password"
              required
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
              inputClassName="auth-input"
            />
            <PasswordStrength password={form.password} />
          </Field>

          <Field className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="auth-label-row">
              <Lock className="size-3.5 text-[var(--muted-strong)]" aria-hidden strokeWidth={2.25} />
              Confirm password
            </Label>
            <PasswordField
              id="confirmPassword"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              autoComplete="new-password"
              minLength={8}
              inputClassName="auth-input"
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
            className="motion-press auth-submit auth-submit-gradient mt-0.5 w-full"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Creating…' : 'Create Account'}
            {!loading ? <ArrowRight className="size-4" aria-hidden /> : null}
          </Button>
        </form>
      </Surface>

      <p
        className="motion-fade-in text-center text-sm text-[var(--muted-strong)]"
        style={{ animationDelay: '100ms' }}
      >
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-bold text-[var(--highlight)] underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
