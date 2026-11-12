'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Download, Search } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { BarChart } from '@/components/dashboard/bar-chart';
import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { AdminActivityPageSkeleton } from '@/components/skeletons';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { ContentIn } from '@/components/ui/skeleton';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { apiFetch } from '@/lib/api/client';
import type {
  ActivityEventRow,
  ActivityOverview,
  ActivityTrends,
  OnlineUserRow,
} from '@/lib/api/admin-activity-types';
import { useCursorList } from '@/lib/hooks/use-cursor-list';
import { Activity, Clock3, Users } from 'lucide-react';
import {
  AdminListMeta,
  AdminPage,
  AdminSection,
  AdminStatGrid,
  AdminToolbar,
} from '@/components/admin/admin-page';
import {
  AdminEmptyRow,
  AdminTable,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from '@/components/admin/admin-table';

const EVENT_TYPES = [
  '',
  'LOGIN',
  'LOGOUT',
  'QUESTION_ATTEMPT',
  'PRACTICE_START',
  'PRACTICE_SUBMIT',
  'BOOKMARK_QUESTION',
  'BOOKMARK_DOCUMENT',
  'DOCUMENT_VIEW',
] as const;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function ActivityPageInner() {
  const searchParams = useSearchParams();
  const initialUserId = searchParams.get('userId') ?? '';

  const [onlineQ, setOnlineQ] = useState('');
  const [userId, setUserId] = useState(initialUserId);
  const [type, setType] = useState('');
  const [range, setRange] = useState<'7' | '14' | '30' | 'custom'>('14');
  const [from, setFrom] = useState(daysAgoIso(13).slice(0, 10));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [exporting, setExporting] = useState(false);

  const dateQuery = useMemo(() => {
    if (range === 'custom') {
      return {
        from: from ? new Date(`${from}T00:00:00.000Z`).toISOString() : undefined,
        to: to ? new Date(`${to}T23:59:59.999Z`).toISOString() : undefined,
      };
    }
    const days = Number(range);
    return { from: daysAgoIso(days - 1), to: new Date().toISOString() };
  }, [range, from, to]);

  const overview = useQuery({
    queryKey: ['admin-activity-overview'],
    queryFn: () => apiFetch<ActivityOverview>('/admin/activity/overview'),
    refetchInterval: 20_000,
  });

  const online = useQuery({
    queryKey: ['admin-activity-online', onlineQ],
    queryFn: () => {
      const params = new URLSearchParams();
      if (onlineQ.trim()) params.set('q', onlineQ.trim());
      const qs = params.toString();
      return apiFetch<{ items: OnlineUserRow[]; onlineHeartbeatWindowMs: number }>(
        `/admin/activity/online${qs ? `?${qs}` : ''}`,
      );
    },
    refetchInterval: 20_000,
  });

  const trends = useQuery({
    queryKey: ['admin-activity-trends', dateQuery.from, dateQuery.to],
    queryFn: () => {
      const params = new URLSearchParams();
      if (dateQuery.from) params.set('from', dateQuery.from);
      if (dateQuery.to) params.set('to', dateQuery.to);
      return apiFetch<ActivityTrends>(`/admin/activity/trends?${params}`);
    },
  });

  const events = useCursorList<ActivityEventRow>(
    ['admin-activity-events', userId, type, dateQuery.from, dateQuery.to],
    (cursor) => {
      const params = new URLSearchParams({ limit: '40' });
      if (userId.trim()) params.set('userId', userId.trim());
      if (type) params.set('type', type);
      if (dateQuery.from) params.set('from', dateQuery.from);
      if (dateQuery.to) params.set('to', dateQuery.to);
      if (cursor) params.set('cursor', cursor);
      return `/admin/activity/events?${params}`;
    },
  );

  if (overview.isLoading && !overview.data) {
    return <AdminActivityPageSkeleton />;
  }

  if (overview.error || !overview.data) {
    return <Alert variant="danger">Could not load activity overview.</Alert>;
  }

  const ov = overview.data;
  const attemptBars =
    trends.data?.series.map((d) => ({
      label: d.date.slice(5),
      value: d.attempts,
    })) ?? [];
  const activeBars =
    trends.data?.series.map((d) => ({
      label: d.date.slice(5),
      value: Math.round(d.activeSeconds / 60),
    })) ?? [];

  async function downloadCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (userId.trim()) params.set('userId', userId.trim());
      if (type) params.set('type', type);
      if (dateQuery.from) params.set('from', dateQuery.from);
      if (dateQuery.to) params.set('to', dateQuery.to);
      const qs = params.toString();
      const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
      const res = await fetch(`${base}/admin/activity/export${qs ? `?${qs}` : ''}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activity-events-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Analytics"
        title="Learner activity"
        description={`Online uses ACTIVE browsing sessions with heartbeat within ${Math.round(ov.onlineHeartbeatWindowMs / 1000)}s (DEC-009).`}
        actions={
          <Button
            size="sm"
            variant="outline"
            disabled={exporting}
            onClick={() => void downloadCsv()}
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        }
      />

      <AdminStatGrid>
        <StatCard label="Registered" value={ov.registered} icon={Users} tone="navy" />
        <StatCard label="Online now" value={ov.online} icon={Activity} tone="teal" />
        <StatCard
          label="Active sessions"
          value={ov.sessionsActive}
          hint="Status ACTIVE (may be idle)"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Attempts today"
          value={ov.engagement.today.attempts}
          hint={`${ov.engagement.today.practiceCompletes} practice · ${formatDuration(ov.engagement.today.activeSeconds)} active`}
          icon={Activity}
          tone="blue"
        />
      </AdminStatGrid>

      <Surface className="space-y-3 p-4 sm:p-5">
        <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
          Presence buckets (distinct users with heartbeat)
        </p>
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline">5m · {ov.onlineBuckets.m5}</Badge>
          <Badge variant="outline">15m · {ov.onlineBuckets.m15}</Badge>
          <Badge variant="outline">30m · {ov.onlineBuckets.m30}</Badge>
          <Badge variant="outline">
            7d · {ov.engagement.d7.attempts} attempts ·{' '}
            {formatDuration(ov.engagement.d7.activeSeconds)}
          </Badge>
          <Badge variant="outline">
            30d · {ov.engagement.d30.attempts} attempts ·{' '}
            {formatDuration(ov.engagement.d30.activeSeconds)}
          </Badge>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2">
        <AdminSection
          title="Online users"
          description="Sessions with a recent heartbeat."
          actions={
            <form
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-strong)]"
                  aria-hidden
                />
                <Input
                  value={onlineQ}
                  onChange={(e) => setOnlineQ(e.target.value)}
                  placeholder="Search online"
                  aria-label="Search online users"
                  className="h-9 w-44 pl-8 text-sm"
                />
              </div>
            </form>
          }
        >
          <Surface className="p-4 sm:p-5">
            {online.isLoading ? (
              <p className="text-sm text-[var(--muted-strong)]">Loading…</p>
            ) : online.data?.items.length === 0 ? (
              <p className="text-sm text-[var(--muted-strong)]">
                Nobody online in the heartbeat window.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--line)]">
                {online.data?.items.map((row) => (
                  <li
                    key={row.sessionId}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/admin/users/${row.user.id}`}
                        className="font-medium text-[var(--ink)] hover:underline"
                      >
                        {row.user.name}
                      </Link>
                      <p className="truncate text-xs text-[var(--muted-strong)]">
                        {row.user.whatsappNumber}
                      </p>
                    </div>
                    <div className="text-right text-xs text-[var(--muted-strong)]">
                      <p>{formatDuration(row.accruedSeconds)} measured</p>
                      <p>♥ {new Date(row.lastHeartbeatAt).toLocaleTimeString()}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Surface>
        </AdminSection>

        <AdminSection
          title="Trends"
          description="Attempts and approximate active time."
          actions={(['7', '14', '30', 'custom'] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? 'primary' : 'outline'}
              aria-pressed={range === r}
              onClick={() => setRange(r)}
            >
              {r === 'custom' ? 'Custom' : `${r}d`}
            </Button>
          ))}
        >
          <Surface className="space-y-4 p-4 sm:p-5">
            {range === 'custom' ? (
              <div className="flex flex-wrap gap-2">
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-auto"
                  aria-label="From date"
                />
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-auto"
                  aria-label="To date"
                />
              </div>
            ) : null}
            {trends.isLoading ? (
              <p className="text-sm text-[var(--muted-strong)]">Loading trends…</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <p className="mb-2 text-xs font-semibold text-[var(--muted-strong)] uppercase">
                    Attempts / day
                  </p>
                  <BarChart data={attemptBars} />
                </div>
                <div>
                  <p className="mb-2 text-xs font-semibold text-[var(--muted-strong)] uppercase">
                    Active minutes / day (approx)
                  </p>
                  <BarChart data={activeBars} />
                </div>
              </div>
            )}
          </Surface>
        </AdminSection>
      </div>

      <AdminSection
        title="Event timeline"
        description="LearningActivityEvent stream (no secrets / keystrokes)."
      >
        <AdminToolbar>
          <div className="admin-filter-grid">
            <Input
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Filter user UUID"
              className="h-10"
              aria-label="Filter by user UUID"
            />
            <Select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="h-10 w-full sm:w-52"
              aria-label="Event type"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t || 'all'} value={t}>
                  {t || 'All types'}
                </option>
              ))}
            </Select>
          </div>
        </AdminToolbar>

        {events.isLoading ? (
          <p className="text-sm text-[var(--muted-strong)]">Loading events…</p>
        ) : events.error ? (
          <Alert variant="danger">Could not load events.</Alert>
        ) : (
          <ContentIn>
            <AdminTableShell
              minWidth="40rem"
              header={
                <AdminListMeta
                  count={events.items.length}
                  noun="event"
                  hasMore={events.hasNextPage}
                />
              }
              footer={
                events.hasNextPage ? (
                  <LoadMoreButton
                    hasNextPage={events.hasNextPage}
                    isFetchingNextPage={events.isFetchingNextPage}
                    onLoadMore={() => void events.fetchNextPage()}
                    className="flex justify-center"
                  />
                ) : undefined
              }
            >
              <AdminTable>
                <thead>
                  <tr>
                    <AdminTh>When</AdminTh>
                    <AdminTh>Type</AdminTh>
                    <AdminTh>User</AdminTh>
                    <AdminTh>Refs</AdminTh>
                  </tr>
                </thead>
                <tbody>
                  {events.items.length === 0 ? (
                    <AdminEmptyRow colSpan={4}>No events in this range.</AdminEmptyRow>
                  ) : (
                    events.items.map((e) => (
                      <tr key={e.id}>
                        <AdminTd muted className="text-xs whitespace-nowrap">
                          {new Date(e.occurredAt).toLocaleString()}
                        </AdminTd>
                        <AdminTd>
                          <Badge variant="outline">{e.type}</Badge>
                        </AdminTd>
                        <AdminTd>
                          <Link
                            href={`/admin/users/${e.user.id}`}
                            className="font-medium text-[var(--ink)] hover:underline"
                          >
                            {e.user.name}
                          </Link>
                        </AdminTd>
                        <AdminTd muted className="text-xs">
                          {[
                            e.questionId && `Q ${e.questionId.slice(0, 8)}`,
                            e.practiceSetId && `PS ${e.practiceSetId.slice(0, 8)}`,
                          ]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </AdminTd>
                      </tr>
                    ))
                  )}
                </tbody>
              </AdminTable>
            </AdminTableShell>
          </ContentIn>
        )}
      </AdminSection>
    </AdminPage>
  );
}

export default function AdminActivityPage() {
  return (
    <Suspense fallback={<AdminActivityPageSkeleton />}>
      <ActivityPageInner />
    </Suspense>
  );
}
