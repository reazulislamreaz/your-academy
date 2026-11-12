'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminUserDetail } from '@/lib/api/admin-activity-types';
import { AdminUsersDetailPageSkeleton } from '@/components/skeletons';
import { useState } from 'react';
import { AdminPage } from '@/components/admin/admin-page';

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => apiFetch<AdminUserDetail>(`/admin/users/${id}`),
    enabled: Boolean(id),
  });

  const updateStatus = useMutation({
    mutationFn: (status: 'ACTIVE' | 'SUSPENDED') =>
      apiFetch(`/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-user', id] });
      void qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    },
  });

  if (detail.isLoading) return <AdminUsersDetailPageSkeleton />;
  if (detail.error || !detail.data) {
    return <Alert variant="danger">Could not load this user.</Alert>;
  }

  const { profile, subscription, study, observedEngagement, sessions, recentEvents } = detail.data;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="People"
        title={profile.name}
        description={`${profile.whatsappNumber}${profile.email ? ` · ${profile.email}` : ''}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/users">
              <Button size="sm" variant="outline">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            {profile.role !== 'ADMIN' ? (
              profile.status === 'ACTIVE' ? (
                <ConfirmButton
                  size="sm"
                  variant="danger"
                  confirmTitle="Suspend this user?"
                  confirmMessage={`Suspend ${profile.name}? They will not be able to sign in until reinstated.`}
                  confirmLabel="Suspend"
                  reversible
                  onConfirm={() => updateStatus.mutateAsync('SUSPENDED')}
                >
                  Suspend
                </ConfirmButton>
              ) : (
                <ConfirmButton
                  size="sm"
                  variant="secondary"
                  confirmTitle="Reinstate this user?"
                  confirmMessage={`Reinstate ${profile.name}?`}
                  confirmLabel="Reinstate"
                  destructive={false}
                  reversible
                  onConfirm={() => updateStatus.mutateAsync('ACTIVE')}
                >
                  Reinstate
                </ConfirmButton>
              )
            ) : null}
          </div>
        }
      />

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Surface className="space-y-3 p-5 lg:col-span-1">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Profile
          </h2>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">{profile.role}</Badge>
            <Badge variant={profile.status === 'ACTIVE' ? 'success' : 'danger'}>
              {profile.status}
            </Badge>
            {profile.online ? <Badge variant="success">Online</Badge> : null}
          </div>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted-strong)]">Joined</dt>
              <dd>{new Date(profile.createdAt).toLocaleString()}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted-strong)]">Trial</dt>
              <dd>
                {profile.trialActive ? 'Active' : 'Ended'} ·{' '}
                {new Date(profile.trialEndsAt).toLocaleDateString()}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted-strong)]">Subscription</dt>
              <dd>{subscription ? subscription.plan.name : 'None (read-only)'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted-strong)]">Last heartbeat</dt>
              <dd>
                {profile.lastHeartbeatAt
                  ? new Date(profile.lastHeartbeatAt).toLocaleString()
                  : '—'}
              </dd>
            </div>
          </dl>
        </Surface>

        <Surface className="space-y-3 p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Learning stats
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Measured active" value={formatDuration(study.activeSeconds)} />
            <Stat label="Sessions" value={String(study.sessionCount)} />
            <Stat
              label="MCQ attempts"
              value={`${study.attempts}`}
              hint={`${study.correct} correct · ${study.incorrect} incorrect`}
            />
            <Stat
              label="Practice completes"
              value={String(study.practiceCompletes)}
              hint={`${study.practiceCorrect} correct · ${study.practiceWrong} wrong`}
            />
          </div>
        </Surface>
      </div>

      <Surface className="space-y-3 p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
              Observed engagement
            </h2>
            <p className="mt-1 text-xs text-[var(--muted-strong)]">
              Topics with at least 3 attempts (not claimed intent).
            </p>
          </div>
          <Link href={`/admin/activity?userId=${profile.id}`}>
            <Button size="sm" variant="outline">
              View activity
            </Button>
          </Link>
        </div>
        {observedEngagement.length === 0 ? (
          <p className="text-sm text-[var(--muted-strong)]">Not enough attempts yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {observedEngagement.map((row) => (
              <li key={row.categoryId} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="font-medium text-[var(--ink)]">{row.name}</span>
                <span className="text-[var(--muted-strong)]">{row.attempts} attempts</span>
              </li>
            ))}
          </ul>
        )}
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="space-y-3 p-5">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Recent sessions
          </h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-[var(--muted-strong)]">No browsing sessions.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {sessions.map((s) => (
                <li
                  key={s.id}
                  className="rounded-[10px] border border-[var(--line)] px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="outline">{s.status}</Badge>
                    <span className="text-xs text-[var(--muted-strong)]">
                      {new Date(s.startedAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted-strong)]">
                    Measured {formatDuration(s.accruedSeconds)} · Wall{' '}
                    {formatDuration(s.wallSeconds)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="space-y-3 p-5">
          <h2 className="text-sm font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Recent events
          </h2>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-[var(--muted-strong)]">No activity events yet.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {recentEvents.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] py-2 last:border-0"
                >
                  <Badge variant="outline">{e.type}</Badge>
                  <span className="text-xs text-[var(--muted-strong)]">
                    {new Date(e.occurredAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </AdminPage>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] px-3 py-3">
      <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-[var(--ink)]">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-[var(--muted-strong)]">{hint}</p> : null}
    </div>
  );
}
