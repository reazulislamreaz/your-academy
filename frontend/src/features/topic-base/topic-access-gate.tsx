'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, type ReactNode } from 'react';
import { ListCardSkeleton } from '@/components/loading';
import { useMe } from '@/features/auth/use-auth';
import { Paywall } from '@/features/billing/paywall';

/**
 * DEC-061 — Topic Base pages: signed-out visitors go to login and come back here; signed-in
 * users without trial / subscription see the paywall. UX only: the topic question APIs
 * refuse the same users on the server, so content never loads for them.
 */
export function TopicAccessGate({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<ListCardSkeleton rows={3} />}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const signedOut = !me.isLoading && !me.data;

  useEffect(() => {
    if (!signedOut) return;
    const here = `${pathname}${search ? `?${search}` : ''}`;
    router.replace(`/login?next=${encodeURIComponent(here)}`);
  }, [pathname, router, search, signedOut]);

  if (me.isLoading || signedOut) {
    return (
      <div role="status" aria-live="polite" className="space-y-3">
        <span className="sr-only">{signedOut ? 'Redirecting to login…' : 'Loading…'}</span>
        <ListCardSkeleton rows={3} />
      </div>
    );
  }
  if (!me.data!.access.fullAccess) return <Paywall />;
  return <>{children}</>;
}
