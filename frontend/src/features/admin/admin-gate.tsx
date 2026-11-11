'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';

/**
 * Client RBAC gate for the admin shell.
 * API RolesGuard remains the security boundary; this only keeps UX/routing honest.
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

  if (me.isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isUnauthorized(me.error) || !me.data || me.data.role !== 'ADMIN') {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return <>{children}</>;
}
