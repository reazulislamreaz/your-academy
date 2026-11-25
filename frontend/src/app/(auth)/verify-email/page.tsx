'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { meQueryKey } from '@/features/auth/use-auth';
import { ApiError, apiFetch } from '@/lib/api/client';

/**
 * Email confirmation landing page (DEC-048). Requires an explicit click so link
 * previewers / mail scanners that open URLs cannot consume the single-use token.
 */
function VerifyEmail() {
  const qc = useQueryClient();
  const token = useSearchParams().get('token') ?? '';
  const [state, setState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setState('loading');
    setError(null);
    try {
      await apiFetch('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token }),
        skipRefresh: true,
      });
      void qc.invalidateQueries({ queryKey: meQueryKey });
      setState('done');
    } catch (err) {
      setState('idle');
      setError(err instanceof ApiError ? err.message : 'Could not verify your email');
    }
  }

  return (
    <div className="space-y-6">
      <div className="motion-rise space-y-1.5">
        <h1 className="auth-welcome-title font-display text-[1.85rem] font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
          Confirm your email
        </h1>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          Confirming lets you receive password-reset links at this address.
        </p>
      </div>
      <Surface elevated className="motion-rise auth-card-ref space-y-4 p-5 sm:p-6" style={{ animationDelay: '60ms' }}>
        {state === 'done' ? (
          <>
            <Alert variant="success">Your email is verified.</Alert>
            <Link href="/login" className="block">
              <Button className="hero-cta-primary motion-press auth-submit auth-submit-gradient h-11 w-full">
                Continue
              </Button>
            </Link>
          </>
        ) : !token ? (
          <Alert variant="danger">
            This link is missing its token. Open the confirmation link from your email again, or send
            a new one from Account Settings.
          </Alert>
        ) : (
          <>
            {error ? (
              <Alert variant="danger">
                {error}. You can send a new link from Account Settings.
              </Alert>
            ) : null}
            <Button
              type="button"
              onClick={() => void confirm()}
              className="hero-cta-primary motion-press auth-submit auth-submit-gradient h-11 w-full"
              loading={state === 'loading'}
              disabled={state === 'loading'}
            >
              {state === 'loading' ? 'Confirming…' : 'Confirm email address'}
            </Button>
          </>
        )}
      </Surface>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmail />
    </Suspense>
  );
}
