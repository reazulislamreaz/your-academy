'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { HomePageSkeleton } from '@/components/skeletons';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';

/** Learner desk-shaped shell while access is resolved. */
function LearnerGateSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-3 py-4 sm:px-6 sm:py-8">
      <HomePageSkeleton />
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Client RBAC gate for the learner `(app)` shell.
 * Admins are sent to the admin console; API RolesGuard remains the security boundary for data.
 */
export function LearnerGate({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    // enabled:false (no CSRF hint) is idle, not loading — still treat as unauthenticated.
    if (me.isLoading) return;
    if (isUnauthorized(me.error) || !me.data) {
      router.replace('/login?next=/home');
      return;
    }
    if (me.data.role === 'ADMIN') {
      router.replace('/admin/dashboard');
    }
  }, [me.isLoading, me.error, me.data, router]);

  if (me.isLoading) {
    return <LearnerGateSkeleton label="Opening your study desk…" />;
  }

  if (isUnauthorized(me.error) || !me.data) {
    return <LearnerGateSkeleton label="Redirecting to sign in…" />;
  }

  if (me.data.role === 'ADMIN') {
    return <LearnerGateSkeleton label="Redirecting to admin…" />;
  }

  return <>{children}</>;
}
