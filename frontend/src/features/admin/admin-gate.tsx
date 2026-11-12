'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { PageHeaderSkeleton, SkStatus } from '@/components/skeletons/primitives';
import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';

/** Neutral gate shell — avoids flashing dashboard-shaped skeleton on every admin route. */
function AdminGateSkeleton() {
  return (
    <SkStatus label="Checking admin access…" className="space-y-6 p-6">
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
 * Client RBAC gate for the admin shell.
 * Non-admins are sent to the learner desk; API RolesGuard remains the security boundary.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();

  useEffect(() => {
    if (me.isLoading) return;
    if (isUnauthorized(me.error) || !me.data) {
      router.replace('/login?next=/admin/dashboard');
      return;
    }
    if (me.data.role !== 'ADMIN') {
      router.replace('/home');
    }
  }, [me.isLoading, me.error, me.data, router]);

  if (me.isLoading || isUnauthorized(me.error) || !me.data || me.data.role !== 'ADMIN') {
    return <AdminGateSkeleton />;
  }

  return <>{children}</>;
}
