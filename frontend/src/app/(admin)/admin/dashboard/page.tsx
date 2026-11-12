'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  ArrowRight,
  Clock3,
  FileQuestion,
  FileText,
  FolderTree,
  Newspaper,
  Plus,
  Users,
} from 'lucide-react';
import { BarChart } from '@/components/dashboard/bar-chart';
import { QuickLink } from '@/components/dashboard/quick-link';
import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';
import { AdminDashboardPageSkeleton } from '@/components/skeletons';

type Dashboard = {
  users: {
    total: number;
    active: number;
    trialActive: number;
    trialExpired: number;
    online: number;
    newRegistrations24h: number;
  };
  questions: { total: number; published: number; draft: number; archived: number };
  categories: number;
  news: number;
  documents: number;
  browsingSecondsTotal: number;
  engagementToday: {
    attempts: number;
    practiceCompletes: number;
    activeSeconds: number;
  };
  topSubjects: Array<{ categoryId: string; name: string; attempts: number }>;
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

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiFetch<Dashboard>('/admin/dashboard'),
  });

  if (isLoading) {
    return <AdminDashboardPageSkeleton />;
  }
  if (error || !data) {
    return <Alert variant="danger">Admin access required.</Alert>;
  }

  const browsingHours = Math.round(data.browsingSecondsTotal / 3600);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin"
        title="Platform overview"
        description="Live KPIs, work queue, and recent platform activity."
        actions={
          <Link href="/admin/questions/new">
            <Button size="sm" className="px-5">
              <Plus className="h-4 w-4" />
              New question
            </Button>
          </Link>
        }
      />

      {/* Work queue first — ops focus before KPI grid */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-bold tracking-tight">Work queue</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Surface className="flex flex-col justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="highlight">Drafts</Badge>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {data.questions.draft}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                Questions waiting to publish (need valid options).
              </p>
            </div>
            <Link href="/admin/questions?status=DRAFT">
              <Button size="sm" variant="soft">
                Review drafts
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Surface>
          <Surface className="flex flex-col justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success">Trials</Badge>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {data.users.trialActive}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                Learners with an active seven-day trial right now.
              </p>
            </div>
            <Link href="/admin/users">
              <Button size="sm" variant="outline">
                Manage users
              </Button>
            </Link>
          </Surface>
          <Surface className="flex flex-col justify-between gap-4 p-5">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Expired</Badge>
                <span className="font-display text-2xl font-bold tabular-nums">
                  {data.users.trialExpired}
                </span>
              </div>
              <p className="mt-2 text-sm text-[var(--muted-strong)]">
                Post-trial browsers — answers gated by entitlement.
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

      <div className="motion-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Registered users"
          value={data.users.total}
          hint={`${data.users.newRegistrations24h} new (24h)`}
          icon={Users}
          tone="navy"
        />
        <StatCard
          label="Online now"
          value={data.users.online}
          hint="Heartbeat within 90s"
          icon={Activity}
          tone="teal"
        />
        <StatCard
          label="Trial active"
          value={data.users.trialActive}
          hint="Answers unlocked"
          icon={Clock3}
          tone="red"
        />
        <StatCard
          label="Engagement today"
          value={data.engagementToday.attempts}
          hint={`${data.engagementToday.practiceCompletes} practice · ${Math.round(data.engagementToday.activeSeconds / 60)} active min`}
          icon={Activity}
          tone="amber"
        />
        <StatCard
          label="Questions"
          value={data.questions.total}
          hint={`${data.questions.published} published`}
          icon={FileQuestion}
          tone="blue"
        />
        <StatCard label="Categories" value={data.categories} icon={FolderTree} tone="slate" />
        <StatCard label="News posts" value={data.news} icon={Newspaper} tone="slate" />
        <StatCard
          label="Browsing hours"
          value={browsingHours}
          hint={`${data.documents} documents`}
          icon={FileText}
          tone="navy"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Surface className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Question bank health</h2>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">Status mix from live question counts.</p>
          </div>
          <BarChart
            emptyLabel="No questions yet."
            data={[
              {
                label: 'Published',
                value: data.questions.published,
                color: 'var(--success)',
              },
              {
                label: 'Draft',
                value: data.questions.draft,
                color: 'var(--highlight)',
              },
              {
                label: 'Archived',
                value: data.questions.archived,
                color: 'var(--muted)',
              },
            ]}
          />
        </Surface>

        <Surface className="space-y-4 p-6">
          <h2 className="font-display text-lg font-bold tracking-tight">Quick actions</h2>
          <div className="grid gap-3">
            <QuickLink
              href="/admin/questions/new"
              title="Create MCQ"
              description="Draft a new question with options"
              icon={FileQuestion}
            />
            <QuickLink
              href="/admin/categories"
              title="Manage categories"
              description="Subjects and topic tree"
              icon={FolderTree}
            />
            <QuickLink
              href="/admin/users"
              title="User controls"
              description="Search, suspend, reinstate"
              icon={Users}
            />
            <QuickLink
              href="/admin/activity"
              title="Learner activity"
              description="Online users, trends, export"
              icon={Activity}
            />
            <QuickLink
              href="/admin/news"
              title="Publish news"
              description="Announcements and columns"
              icon={Newspaper}
            />
          </div>
        </Surface>
      </div>

      {data.topSubjects.length > 0 ? (
        <Surface className="space-y-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Top subjects (7d)</h2>
              <p className="mt-1 text-sm text-[var(--muted-strong)]">
                From real question attempts — not claimed intent.
              </p>
            </div>
            <Link href="/admin/activity">
              <Button size="sm" variant="outline">
                Open activity
              </Button>
            </Link>
          </div>
          <BarChart
            data={data.topSubjects.map((s) => ({
              label: s.name,
              value: s.attempts,
            }))}
          />
        </Surface>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <Surface className="overflow-hidden p-0">
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-3 py-4 sm:px-5">
            <h2 className="min-w-0 truncate font-display text-base font-bold tracking-tight sm:text-lg">
              Recent registrations
            </h2>
            <Link
              href="/admin/users"
              className="shrink-0 text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="min-w-0 w-full max-w-full overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead className="bg-[var(--bg-desk)] text-xs font-semibold tracking-[0.08em] text-[var(--muted-strong)] uppercase">
                <tr>
                  <th className="px-3 py-3 font-semibold sm:px-5">User</th>
                  <th className="px-3 py-3 font-semibold">Role</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold sm:px-5">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {data.recentUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[var(--brand-wash)]">
                    <td className="max-w-[10rem] px-3 py-3 sm:max-w-none sm:px-5">
                      <p className="truncate font-semibold text-[var(--ink)]">{user.name}</p>
                      <p className="truncate text-xs text-[var(--muted-strong)]">{user.whatsappNumber}</p>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline">{user.role}</Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant={user.status === 'ACTIVE' ? 'success' : 'outline'}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--muted-strong)]">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Surface>

        <Surface className="overflow-hidden p-0">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-display text-lg font-bold tracking-tight">System activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[var(--muted-strong)]">No audit events yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {data.recentActivity.map((item) => (
                <li key={item.id} className="px-5 py-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{item.action}</Badge>
                    <span className="text-xs text-[var(--muted-strong)]">{item.entityType}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--ink-soft)]">
                    {item.actor ? item.actor.name : 'System'}
                    <span className="text-[var(--muted-strong)]">
                      {' '}
                      · {new Date(item.createdAt).toLocaleString()}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </div>
  );
}
