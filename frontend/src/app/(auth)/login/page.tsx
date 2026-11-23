'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isValidWhatsapp } from '@your-academy/shared';
import { ArrowRight, Lock, MessageCircle } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { LoginPageSkeleton } from '@/components/skeletons';
import { AuthModeSwitch } from '@/features/auth/auth-mode-switch';
import { PasswordField } from '@/features/auth/password-field';
import { postLoginPath } from '@/features/auth/post-login-path';
import { meQueryKey } from '@/features/auth/use-auth';
import { WhatsappField, toAuthWhatsappPayload } from '@/features/auth/whatsapp-field';
import {
  ApiError,
  SESSION_REPLACED_REASON,
  apiFetch,
  isSessionExpiredLoginReason,
} from '@/lib/api/client';
import type { MeUser } from '@/lib/api/types';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [whatsappNumber, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [touchedWa, setTouchedWa] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionExpired = isSessionExpiredLoginReason(searchParams.get('reason'));
  const sessionReplaced = searchParams.get('reason') === SESSION_REPLACED_REASON;
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
      router.push(
        result.user.mustChangePassword
          ? '/change-password'
          : postLoginPath(result.user, searchParams.get('next')),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-form-stack space-y-5 lg:space-y-5">
      <div className="motion-rise space-y-1.5">
        <h1 className="auth-welcome-title font-display text-[1.85rem] font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
          Welcome Back
        </h1>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          Continue your journey towards exam success.
        </p>
      </div>

      <Surface
        elevated
        className="motion-rise auth-card-ref p-5 pt-6 sm:p-7 sm:pt-7"
        style={{ animationDelay: '50ms' }}
      >
        <AuthModeSwitch active="login" />
        <form onSubmit={onSubmit} className="mt-5 space-y-4" noValidate>
          {sessionReplaced ? (
            <Alert variant="warning">
              Your account was signed in on another device, so you have been signed out here. Using
              the same account on more than one device at a time is not allowed.
            </Alert>
          ) : null}
          {sessionExpired ? (
            <Alert variant="warning">Your session expired. Sign in again to continue.</Alert>
          ) : null}
          <Field className="space-y-1.5">
            <Label htmlFor="whatsapp" className="auth-label-row">
              <MessageCircle className="size-3.5 text-[#25D366]" aria-hidden strokeWidth={2.25} />
              WhatsApp number
            </Label>
            <WhatsappField
              id="whatsapp"
              value={whatsappNumber}
              onChange={(v) => {
                setWhatsapp(v);
                if (!touchedWa && v.trim().length >= 10) setTouchedWa(true);
              }}
              touched={touchedWa}
              autoComplete="username"
              showPhoneIcon
            />
          </Field>
          <Field className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="password" className="auth-label-row">
                <Lock
                  className="size-3.5 text-[var(--muted-strong)]"
                  aria-hidden
                  strokeWidth={2.25}
                />
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="text-[0.75rem] font-semibold text-[var(--highlight)] transition-colors hover:brightness-110"
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
              inputClassName="auth-input"
            />
          </Field>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Button
            type="submit"
            className="hero-cta-primary motion-press auth-submit auth-submit-gradient mt-1 h-11 w-full"
            disabled={loading}
            loading={loading}
          >
            {loading ? 'Signing in…' : 'Sign In'}
            {!loading ? <ArrowRight className="size-4" aria-hidden /> : null}
          </Button>
        </form>
      </Surface>

      <p
        className="motion-fade-in text-center text-sm text-[var(--muted-strong)]"
        style={{ animationDelay: '100ms' }}
      >
        New to Your Academy?{' '}
        <Link
          href="/register"
          className="inline-flex min-h-11 items-center font-bold text-[var(--highlight)] underline-offset-2 hover:underline"
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
