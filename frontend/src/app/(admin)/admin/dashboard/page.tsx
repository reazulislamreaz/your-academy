'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';

type Dashboard = {
  users: { total: number; active: number; trialActive: number; trialExpired: number };
  questions: { total: number; published: number; draft: number; archived: number };
  categories: number;
  news: number;
  documents: number;
  browsingSecondsTotal: number;
  recentUsers: Array<{
    id: string;
    name: string;
    whatsappNumber: string;
    createdAt: string;
    role: string;
    status: string;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId?: string | null;
    createdAt: string;
    actor: { id: string; name: string; role: string } | null;
  }>;
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Surface className="p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</p>
    </Surface>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiFetch<Dashboard>('/admin/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }
  if (error || !data) {
    return <Alert variant="danger">Admin access required.</Alert>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operations"
        title="Overview"
        description="Live counts, recent signups, and audit activity."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data.users.total} />
        <Stat label="Active users" value={data.users.active} />
        <Stat label="Trial active" value={data.users.trialActive} />
        <Stat label="Trial expired" value={data.users.trialExpired} />
        <Stat label="Questions" value={data.questions.total} />
        <Stat label="Published" value={data.questions.published} />
        <Stat label="Drafts" value={data.questions.draft} />
        <Stat label="Archived" value={data.questions.archived} />
        <Stat label="Categories" value={data.categories} />
        <Stat label="News" value={data.news} />
        <Stat label="Documents" value={data.documents} />
        <Stat label="Browsing hours" value={Math.round(data.browsingSecondsTotal / 3600)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Surface className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent users</h2>
            <Link href="/admin/users" className="text-sm font-semibold underline-offset-2 hover:underline">
              Manage
            </Link>
          </div>
          <ul className="space-y-2">
            {data.recentUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="font-medium">{user.name}</span>
                  <span className="text-[var(--muted)]"> · {user.whatsappNumber}</span>
                </span>
                <span className="text-xs text-[var(--muted)]">{user.status}</span>
              </li>
            ))}
          </ul>
        </Surface>

        <Surface className="space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Recent activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No audit events yet.</p>
          ) : (
            <ul className="space-y-2">
              {data.recentActivity.map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="font-medium">{item.action}</span>
                  <span className="text-[var(--muted)]">
                    {' '}
                    · {item.entityType}
                    {item.actor ? ` · ${item.actor.name}` : ''}
                  </span>
                  <span className="mt-0.5 block text-xs text-[var(--muted)]">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </div>
  );
}
