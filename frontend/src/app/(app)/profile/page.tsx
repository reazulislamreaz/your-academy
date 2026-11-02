'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';

type Me = {
  name: string;
  whatsappNumber: string;
  email: string | null;
  role: string;
  access: { isTrialActive: boolean; trialEndsAt: string; entitlements: string[] };
};

export default function ProfilePage() {
  const me = useQuery({ queryKey: ['me'], queryFn: () => apiFetch<Me>('/users/me') });
  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () =>
      apiFetch<{ questionBookmarks: number; browsingSeconds: number }>('/users/me/stats'),
  });

  if (me.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (me.error || !me.data) {
    return (
      <Alert variant="warning">
        Sign in to view profile.{' '}
        <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </Alert>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Profile" description="Your account and trial status." />
      <div className="grid gap-4 md:grid-cols-2">
        <Surface className="p-6">
          <p className="text-sm text-[var(--muted)]">Name</p>
          <p className="mt-1 text-xl font-semibold">{me.data.name}</p>
          <p className="mt-4 text-sm text-[var(--muted)]">WhatsApp</p>
          <p className="mt-1">{me.data.whatsappNumber}</p>
          {me.data.email ? (
            <>
              <p className="mt-4 text-sm text-[var(--muted)]">Email</p>
              <p className="mt-1">{me.data.email}</p>
            </>
          ) : null}
          <p className="mt-4 text-sm text-[var(--muted)]">Role</p>
          <Badge className="mt-1" variant="inverse">
            {me.data.role}
          </Badge>
        </Surface>
        <Surface className="p-6">
          <p className="text-sm text-[var(--muted)]">Trial</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="text-xl font-semibold">
              {me.data.access.isTrialActive ? 'Active' : 'Expired'}
            </p>
            <Badge variant={me.data.access.isTrialActive ? 'success' : 'outline'}>
              {me.data.access.isTrialActive ? 'Full answers' : 'Browse only'}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Ends {new Date(me.data.access.trialEndsAt).toLocaleString()}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">Saved questions</p>
          <p className="text-xl font-semibold">{stats.data?.questionBookmarks ?? 0}</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Browsing time</p>
          <p className="text-xl font-semibold">
            {Math.round((stats.data?.browsingSeconds ?? 0) / 60)} min
          </p>
        </Surface>
      </div>
    </div>
  );
}
