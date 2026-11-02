'use client';

import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';

type Dashboard = {
  users: { total: number; active: number; trialActive: number; trialExpired: number };
  questions: { total: number; published: number; draft: number };
  categories: number;
  news: number;
  documents: number;
  browsingSecondsTotal: number;
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
        description="Live counts from the Your Academy database."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Users" value={data.users.total} />
        <Stat label="Trial active" value={data.users.trialActive} />
        <Stat label="Published questions" value={data.questions.published} />
        <Stat label="Draft questions" value={data.questions.draft} />
        <Stat label="Categories" value={data.categories} />
        <Stat label="News" value={data.news} />
        <Stat label="Documents" value={data.documents} />
        <Stat label="Browsing hours" value={Math.round(data.browsingSecondsTotal / 3600)} />
      </div>
    </div>
  );
}
