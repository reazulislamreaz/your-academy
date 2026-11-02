'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';

export function AdminGate({ children }: { children: ReactNode }) {
  const me = useMe();

  if (me.isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isUnauthorized(me.error) || !me.data) {
    return (
      <Alert variant="warning">
        Sign in as an admin to continue.{' '}
        <Link href="/login?next=/admin/dashboard" className="font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </Alert>
    );
  }

  if (me.data.role !== 'ADMIN') {
    return (
      <div className="space-y-4 p-6">
        <Alert variant="danger">Admin access required.</Alert>
        <Link href="/questions">
          <Button variant="outline">Back to app</Button>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
