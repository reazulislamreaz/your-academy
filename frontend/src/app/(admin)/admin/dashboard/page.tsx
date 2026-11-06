'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';

type Dashboard = {
  users: { total: number; active: number; trialActive: number; trialExpired: number };
  questions: { total: number; published: number; draft: number; archived: number };
  categories: number;
  news: number;
  documents: number;
  exams?: { papers: number; publishedPapers: number; attempts: number };
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

function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'action' | 'warn';
}) {
  return (
    <div
      className={
        tone === 'action'
          ? 'bg-[var(--highlight-soft)] px-4 py-4'
          : tone === 'warn'
            ? 'bg-[var(--bg-muted)] px-4 py-4'
            : 'bg-[var(--bg-elevated)] px-4 py-4'
      }
    >
      <p className="text-[10px] font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
        {label}
      </p>
      <p className="mt-1.5 font-display text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p> : null}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiFetch<Dashboard>('/admin/dashboard'),
  });

  if (isLoading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
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
        description="Work queue first — then live counts, signups, and audit activity."
      />

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold tracking-tight">Work queue</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Surface density="compact" className="flex flex-col justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="highlight">Drafts</Badge>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {data.questions.draft}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Questions waiting to publish (need valid options).
              </p>
            </div>
            <Link href="/admin/questions">
              <Button size="sm" variant="soft">
                Review questions
              </Button>
            </Link>
          </Surface>
          <Surface density="compact" className="flex flex-col justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Trials</Badge>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {data.users.trialActive}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Learners with an active seven-day trial right now.
              </p>
            </div>
            <Link href="/admin/users">
              <Button size="sm" variant="outline">
                Manage users
              </Button>
            </Link>
          </Surface>
          <Surface density="compact" className="flex flex-col justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Expired trials</Badge>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {data.users.trialExpired}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Still browsing — answers gated by entitlement.
              </p>
            </div>
            <Link href="/admin/users">
              <Button size="sm" variant="ghost">
                Open users
              </Button>
            </Link>
          </Surface>
        </div>
      </section>

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)]">
        <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Users" value={data.users.total} />
          <Stat label="Active users" value={data.users.active} />
          <Stat
            label="Trial active"
            value={data.users.trialActive}
            tone="action"
            hint="Full answers unlocked"
          />
          <Stat label="Trial expired" value={data.users.trialExpired} tone="warn" />
          <Stat label="Questions" value={data.questions.total} />
          <Stat label="Published" value={data.questions.published} />
          <Stat label="Drafts" value={data.questions.draft} tone="action" />
          <Stat label="Archived" value={data.questions.archived} />
          <Stat label="Categories" value={data.categories} />
          <Stat label="News" value={data.news} />
          <Stat label="Documents" value={data.documents} />
          <Stat label="Exam papers" value={data.exams?.papers ?? 0} />
          <Stat label="Published papers" value={data.exams?.publishedPapers ?? 0} />
          <Stat label="Exam attempts" value={data.exams?.attempts ?? 0} />
          <Stat label="Browsing hours" value={Math.round(data.browsingSecondsTotal / 3600)} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Surface density="compact" className="space-y-3 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Recent users</h2>
            <Link
              href="/admin/users"
              className="text-sm font-semibold underline-offset-2 hover:underline"
            >
              Manage
            </Link>
          </div>
          <ul className="divide-y divide-[var(--line)]">
            {data.recentUsers.map((user) => (
              <li key={user.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-[var(--muted)]"> · {user.whatsappNumber}</span>
                </span>
                <span className="shrink-0 text-xs text-[var(--muted)]">{user.status}</span>
              </li>
            ))}
          </ul>
        </Surface>

        <Surface density="compact" className="space-y-3 p-5">
          <h2 className="font-display text-lg font-semibold">Recent activity</h2>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No audit events yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {data.recentActivity.map((item) => (
                <li key={item.id} className="py-2.5 text-sm">
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
