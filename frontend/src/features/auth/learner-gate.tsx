'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { HomePageSkeleton } from '@/components/skeletons';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';
import { isStaffRole } from '@your-academy/shared';
import { defaultPathForRole } from '@/lib/auth/role-routing';

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
 * Staff (Admin / Moderator) are sent to the dashboard; API RolesGuard remains the security boundary for data.
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
    if (isStaffRole(me.data.role)) {
      router.replace(defaultPathForRole(me.data.role));
    }
  }, [me.isLoading, me.error, me.data, router]);

  if (me.isLoading) {
    return <LearnerGateSkeleton label="Opening your study desk…" />;
  }

  if (isUnauthorized(me.error) || !me.data) {
    return <LearnerGateSkeleton label="Redirecting to sign in…" />;
  }

  if (isStaffRole(me.data.role)) {
    return <LearnerGateSkeleton label="Redirecting to the dashboard…" />;
  }

  return <>{children}</>;
}
