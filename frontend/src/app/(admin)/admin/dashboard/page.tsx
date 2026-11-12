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
import { AdminPage, AdminSection, AdminStatGrid } from '@/components/admin/admin-page';
import { AdminUserStatus } from '@/components/admin/admin-status';
import {
  AdminEmptyRow,
  AdminTable,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from '@/components/admin/admin-table';
import { BarChart } from '@/components/dashboard/bar-chart';
import { QuickLink } from '@/components/dashboard/quick-link';
import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
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
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiFetch<Dashboard>('/admin/dashboard'),
  });

  if (isLoading) {
    return <AdminDashboardPageSkeleton />;
  }
  if (error || !data) {
    return (
      <LoadError message="Could not load the admin overview." onRetry={() => void refetch()} />
    );
  }

  const browsingHours = Math.round(data.browsingSecondsTotal / 3600);

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Overview"
        title="Platform console"
        description="Work queue, live KPIs, and recent platform activity — optimized for daily operations."
        actions={
          <Link href="/admin/questions/new">
            <Button size="sm">
              <Plus className="h-4 w-4" />
              New question
            </Button>
          </Link>
        }
      />

      <AdminSection
        title="Work queue"
        description="Highest-priority ops items before the KPI grid."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Surface elevated className="flex flex-col justify-between gap-4 p-5">
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
          <Surface elevated className="flex flex-col justify-between gap-4 p-5">
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
          <Surface elevated className="flex flex-col justify-between gap-4 p-5">
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
      </AdminSection>

      <AdminSection title="Key metrics" description="Live platform counts.">
        <AdminStatGrid>
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
        </AdminStatGrid>
      </AdminSection>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <AdminSection
          title="Question bank health"
          description="Status mix from live question counts."
        >
          <Surface elevated className="p-5 sm:p-6">
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
        </AdminSection>

        <AdminSection title="Quick actions" description="Jump to common admin tasks.">
          <Surface elevated className="p-5 sm:p-6">
            <div className="grid gap-3">
              <QuickLink
                href="/admin/questions/new"
                title="Create MCQ"
                description="Draft a new question with options"
                icon={FileQuestion}
              />
              <QuickLink
                href="/admin/question-imports/new"
                title="Bulk upload"
                description="Import a Google Sheet / Excel set"
                icon={FileText}
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
            </div>
          </Surface>
        </AdminSection>
      </div>

      {data.topSubjects.length > 0 ? (
        <AdminSection
          title="Top subjects (7d)"
          description="From real question attempts — not claimed intent."
          actions={
            <Link href="/admin/activity">
              <Button size="sm" variant="outline">
                Open activity
              </Button>
            </Link>
          }
        >
          <Surface elevated className="p-5 sm:p-6">
            <BarChart
              data={data.topSubjects.map((s) => ({
                label: s.name,
                value: s.attempts,
              }))}
            />
          </Surface>
        </AdminSection>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <AdminTableShell
          minWidth="28rem"
          header={
            <>
              <h2 className="font-display text-base font-bold tracking-tight sm:text-lg">
                Recent registrations
              </h2>
              <Link
                href="/admin/users"
                className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </>
          }
        >
          <AdminTable>
            <thead>
              <tr>
                <AdminTh>User</AdminTh>
                <AdminTh>Role</AdminTh>
                <AdminTh>Status</AdminTh>
                <AdminTh>Joined</AdminTh>
              </tr>
            </thead>
            <tbody>
              {data.recentUsers.length === 0 ? (
                <AdminEmptyRow colSpan={4}>No registrations yet.</AdminEmptyRow>
              ) : (
                data.recentUsers.map((user) => (
                  <tr key={user.id}>
                    <AdminTd className="max-w-[10rem] sm:max-w-none">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="block truncate font-semibold text-[var(--ink)] hover:underline"
                      >
                        {user.name}
                      </Link>
                      <p className="truncate text-xs text-[var(--muted-strong)]">
                        {user.whatsappNumber}
                      </p>
                    </AdminTd>
                    <AdminTd>
                      <Badge variant="outline">{user.role}</Badge>
                    </AdminTd>
                    <AdminTd>
                      <AdminUserStatus status={user.status} />
                    </AdminTd>
                    <AdminTd muted className="text-xs">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </AdminTd>
                  </tr>
                ))
              )}
            </tbody>
          </AdminTable>
        </AdminTableShell>

        <Surface className="overflow-hidden p-0">
          <div className="border-b border-[var(--line)] px-5 py-4">
            <h2 className="font-display text-lg font-bold tracking-tight">System activity</h2>
          </div>
          {data.recentActivity.length === 0 ? (
            <p className="px-5 py-8 text-sm text-[var(--muted-strong)]">No audit events yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {data.recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="px-5 py-3.5 transition-colors hover:bg-[var(--brand-wash)]"
                >
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
    </AdminPage>
  );
}
