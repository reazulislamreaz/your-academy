'use client';

import { useQuery } from '@tanstack/react-query';
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
    queryFn: () => apiFetch<{ questionBookmarks: number; browsingSeconds: number }>('/users/me/stats'),
  });

  if (me.isLoading) return <p className="py-10">Loading…</p>;
  if (me.error || !me.data) return <p className="py-10 text-[var(--danger)]">Sign in to view profile.</p>;

  return (
    <div className="space-y-6 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">Profile</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[24px] border border-[var(--line)] bg-white p-6">
          <p className="text-sm text-[var(--muted)]">Name</p>
          <p className="text-xl font-semibold">{me.data.name}</p>
          <p className="mt-4 text-sm text-[var(--muted)]">WhatsApp</p>
          <p>{me.data.whatsappNumber}</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Role</p>
          <p>{me.data.role}</p>
        </div>
        <div className="rounded-[24px] border border-[var(--line)] bg-white p-6">
          <p className="text-sm text-[var(--muted)]">Trial</p>
          <p className="text-xl font-semibold">
            {me.data.access.isTrialActive ? 'Active' : 'Expired'}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Ends {new Date(me.data.access.trialEndsAt).toLocaleString()}
          </p>
          <p className="mt-4 text-sm text-[var(--muted)]">Saved questions</p>
          <p className="text-xl font-semibold">{stats.data?.questionBookmarks ?? 0}</p>
          <p className="mt-4 text-sm text-[var(--muted)]">Browsing time</p>
          <p className="text-xl font-semibold">
            {Math.round((stats.data?.browsingSeconds ?? 0) / 60)} min
          </p>
        </div>
      </div>
    </div>
  );
}
