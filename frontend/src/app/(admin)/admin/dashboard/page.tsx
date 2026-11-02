'use client';

import { useQuery } from '@tanstack/react-query';
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
    <div className="rounded-[24px] border border-[var(--line)] bg-white p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiFetch<Dashboard>('/admin/dashboard'),
  });

  if (isLoading) return <p className="py-10">Loading…</p>;
  if (error || !data) return <p className="py-10 text-[var(--danger)]">Admin access required.</p>;

  return (
    <div className="space-y-6 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">Admin dashboard</h1>
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
