'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { MessageCircle } from 'lucide-react';
import { ApiError, apiFetch } from '@/lib/api/client';
import { whatsappLink } from '@/lib/support-whatsapp';

const SUPPORT_MESSAGE =
  'Hello Your Academy support, I forgot my password and there is no email on my account. My WhatsApp number is: ';

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
      <div className="motion-rise space-y-1.5">
        <h1 className="auth-welcome-title font-display text-[1.85rem] font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
          Reset password
        </h1>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          Enter the email on your account. If it matches, we send a reset link that works once and
          expires in 30 minutes.
        </p>
      </div>
      <Surface
        elevated
        className="motion-rise auth-card-ref p-5 sm:p-6"
        style={{ animationDelay: '60ms' }}
      >
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
                className="auth-input"
              />
            </Field>
            {error ? <Alert variant="danger">{error}</Alert> : null}
            <p className="text-xs leading-relaxed text-[var(--muted-strong)]">
              Admin and Moderator accounts need a{' '}
              <strong className="font-semibold">verified</strong> email (Account Settings) to use
              this form.
            </p>
            <Button
              type="submit"
              className="hero-cta-primary motion-press auth-submit auth-submit-gradient h-11 w-full"
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
          </form>
        )}
      </Surface>
      <NoEmailHelp />
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

/**
 * Shown to everyone: telling a visitor whether a given number has an email would
 * reveal which accounts exist, so the help is always visible instead.
 */
function NoEmailHelp() {
  const href = whatsappLink(SUPPORT_MESSAGE);
  return (
    <Surface className="space-y-3 p-4 sm:p-5">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-[var(--ink)]">No email on your account?</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          No email is linked to accounts created with only a WhatsApp number. Contact support on
          WhatsApp and we will help you reset your password.
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]" lang="bn">
          আপনার অ্যাকাউন্টে ইমেইল না থাকলে পাসওয়ার্ড রিসেট করতে হোয়াটসঅ্যাপে সাপোর্টের সাথে
          যোগাযোগ করুন।
        </p>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-[var(--radius)] bg-[#25D366] px-4 text-sm font-semibold text-[#0b2e1a] transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ink)]"
        >
          <MessageCircle className="size-4" aria-hidden />
          Contact support on WhatsApp
        </a>
      ) : (
        <p className="text-sm text-[var(--muted-strong)]">Ask an Admin to reset your password.</p>
      )}
    </Surface>
  );
}
