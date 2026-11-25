'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity, BadgeCheck, CalendarCheck, UserPlus, Users, Wifi } from 'lucide-react';
import { useState } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
import { AdminStatGrid } from '@/components/admin/admin-page';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';
import type { ActivityKpis } from '@/lib/api/admin-activity-types';
import { cn } from '@/lib/utils';

const RANGES = [
  { key: 'today', label: '24h' },
  { key: 'd7', label: '7d' },
  { key: 'd30', label: '30d' },
] as const;

/** DEC-067 — user overview KPIs (refreshes every 30 s). */
export function ActivityKpiGrid() {
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('today');
  const kpis = useQuery({
    queryKey: ['admin-activity-kpis'],
    queryFn: () => apiFetch<ActivityKpis>('/admin/activity/kpis'),
    refetchInterval: 30_000,
  });

  if (kpis.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 w-full" />
        ))}
      </div>
    );
  }
  if (kpis.isError || !kpis.data) {
    return <Alert variant="danger">Could not load the user overview.</Alert>;
  }
  const k = kpis.data;
  return (
    <section aria-label="User overview" className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
          User overview
        </p>
        <div
          role="group"
          aria-label="Registrations range"
          className="inline-flex rounded-full border border-[var(--line)] bg-[var(--bg-muted)] p-0.5"
        >
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              aria-pressed={range === r.key}
              onClick={() => setRange(r.key)}
              className={cn(
                'min-h-8 rounded-full px-3 text-xs font-semibold transition-colors',
                range === r.key
                  ? 'bg-[var(--bg-elevated)] text-[var(--ink)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--muted-strong)] hover:text-[var(--ink)]',
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <AdminStatGrid className="xl:grid-cols-3">
        <StatCard
          label={`New registrations · ${RANGES.find((r) => r.key === range)!.label}`}
          value={k.registrations[range]}
          hint={`24h ${k.registrations.today} · 7d ${k.registrations.d7} · 30d ${k.registrations.d30}`}
          icon={UserPlus}
          tone="navy"
        />
        <StatCard
          label="Online now"
          value={k.online.now}
          hint={`Heartbeat ≤ ${Math.round(k.online.windowMs / 1000)}s · ${k.online.m5} in the last 5 min`}
          icon={Wifi}
          tone="teal"
        />
        <StatCard
          label="Paid subscribers"
          value={k.paid.active}
          hint={`${k.paid.percent}% of learners`}
          icon={BadgeCheck}
          tone="purple"
        />
        <StatCard label="Total learners" value={k.totalUsers} icon={Users} tone="slate" />
        <StatCard
          label="Daily active users"
          value={k.dau}
          hint="Heartbeat or activity in the last 24h"
          icon={Activity}
          tone="blue"
        />
        <StatCard
          label="Free vs paid"
          value={`${k.paid.free} / ${k.paid.active}`}
          hint={`New paid: ${k.paid.newConversions.d7} in 7d · ${k.paid.newConversions.d30} in 30d`}
          icon={CalendarCheck}
          tone="amber"
        />
      </AdminStatGrid>
    </section>
  );
}
