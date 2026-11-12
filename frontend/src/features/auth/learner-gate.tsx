'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { PageHeaderSkeleton, SkStatus } from '@/components/skeletons/primitives';
import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';

function LearnerGateSkeleton() {
  return (
    <SkStatus label="Checking access…" className="space-y-6 p-6">
      <PageHeaderSkeleton />
      <Surface className="space-y-3 p-5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-2/3 max-w-md" />
      </Surface>
    </SkStatus>
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

  if (me.isLoading || isUnauthorized(me.error) || !me.data || me.data.role === 'ADMIN') {
    return <LearnerGateSkeleton />;
  }

  return <>{children}</>;
}
