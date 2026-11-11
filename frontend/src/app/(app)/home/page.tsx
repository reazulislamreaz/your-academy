'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Bell,
  BookMarked,
  BookOpen,
  Clock3,
  FileText,
  Sparkles,
  Target,
} from 'lucide-react';
import { BarChart } from '@/components/dashboard/bar-chart';
import { ProgressRing } from '@/components/dashboard/progress-ring';
import { QuickLink } from '@/components/dashboard/quick-link';
import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { TrialCountdown } from '@/features/auth/trial-countdown';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';
import { apiFetch } from '@/lib/api/client';
import type { AnalyticsSummary, CategoryNode, UserStats } from '@/lib/api/types';
import { formatStudyMinutes } from '@/lib/study-prefs';

function trialProgress(trialStartedAt: string, trialEndsAt: string, now = Date.now()) {
  const start = new Date(trialStartedAt).getTime();
  const end = new Date(trialEndsAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  const remaining = Math.max(0, end - now);
  return Math.round((remaining / (end - start)) * 100);
}

export default function StudyHomePage() {
  const me = useMe();

  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiFetch<UserStats>('/users/me/stats'),
    enabled: Boolean(me.data),
  });

  const analytics = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => apiFetch<AnalyticsSummary>('/analytics/me/summary'),
    enabled: Boolean(me.data),
  });

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
    enabled: Boolean(me.data),
  });

  if (me.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isUnauthorized(me.error) || !me.data) {
    return (
      <Alert variant="warning">
        Sign in to open your study home.{' '}
        <Link href="/login" className="font-semibold underline-offset-2 hover:underline">
          Sign in
        </Link>
      </Alert>
    );
  }

  const firstName = me.data.name.split(' ')[0] || me.data.name;
  const last = me.data.study?.lastQuestion ?? null;
  const preferredIds = me.data.study?.preferredCategoryIds ?? [];
  const preferred =
    categories.data?.filter((c) => preferredIds.includes(c.id)).slice(0, 6) ?? [];
  const suggestions =
    preferred.length > 0 ? preferred : (categories.data?.slice(0, 6) ?? []);
  const ring = trialProgress(me.data.access.trialStartedAt, me.data.access.trialEndsAt);
  const daySec = analytics.data?.daySeconds ?? 0;
  const weekSec = analytics.data?.weekSeconds ?? 0;
  const totalSec = analytics.data?.totalSeconds ?? stats.data?.browsingSeconds ?? 0;
  const sessions = analytics.data?.sessions ?? 0;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Dashboard"
        title={`Welcome back, ${firstName}`}
        description="Track your study time, continue practice, and jump into topics you care about."
        actions={
          <Link href="/questions">
            <Button size="sm" className="rounded-full px-5">
              Practice MCQs
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        }
      />

      {/* Overview metrics — real bookmark + browsing data */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Saved questions"
          value={stats.data?.questionBookmarks ?? 0}
          hint="Bookmarked MCQs"
          icon={BookMarked}
          tone="red"
        />
        <StatCard
          label="Saved PDFs"
          value={stats.data?.documentBookmarks ?? 0}
          hint="Study documents"
          icon={FileText}
          tone="blue"
        />
        <StatCard
          label="Study time"
          value={formatStudyMinutes(totalSec)}
          hint="All sessions"
          icon={Clock3}
          tone="navy"
        />
        <StatCard
          label="Sessions"
          value={sessions}
          hint="Browsing sessions recorded"
          icon={Target}
          tone="teal"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        {/* Continue + quick actions */}
        <Surface className="motion-rise space-y-5 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            <Sparkles className="h-3.5 w-3.5 text-[var(--highlight)]" aria-hidden />
            Continue studying
          </div>
          {last ? (
            <div className="rounded-[14px] border border-[var(--line)] bg-[var(--bg-desk)] p-5">
              <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
                Last opened
              </p>
              <h2 className="mt-2 font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                {last.title}
              </h2>
              {last.categoryName ? (
                <p className="mt-1 text-sm text-[var(--muted)]">{last.categoryName}</p>
              ) : null}
              <Link
                href={`/questions/${last.id}${last.filterQs ? `?${last.filterQs}` : ''}`}
                className="mt-4 inline-flex"
              >
                <Button className="rounded-full px-5">
                  Resume question
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-[14px] border border-dashed border-[var(--line-strong)] bg-[var(--bg-desk)] p-5">
              <h2 className="font-display text-xl font-bold tracking-tight">
                Start a practice session
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                Open any question — we remember it here across devices so you can continue later.
              </p>
              <Link href="/questions" className="mt-4 inline-flex">
                <Button className="rounded-full px-5">Browse question bank</Button>
              </Link>
            </div>
          )}

          <div>
            <h3 className="mb-3 font-display text-sm font-bold tracking-tight text-[var(--ink)]">
              Quick access
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <QuickLink
                href="/questions"
                title="MCQ practice"
                description="Browse and filter the question bank"
                icon={BookOpen}
              />
              <QuickLink
                href="/bookmarks"
                title="Saved items"
                description="Questions and PDFs you bookmarked"
                icon={BookMarked}
              />
              <QuickLink
                href="/documents"
                title="PDF library"
                description="Published study documents"
                icon={FileText}
              />
              <QuickLink
                href="/profile"
                title="Account settings"
                description="Profile, avatar, and password"
                icon={Target}
              />
            </div>
          </div>
        </Surface>

        {/* Access + updates */}
        <div className="space-y-5">
          <Surface className="motion-rise space-y-4 p-6" style={{ animationDelay: '60ms' }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">Access status</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">Trial entitlement from your account</p>
              </div>
              <ProgressRing
                value={me.data.access.isTrialActive ? ring : 0}
                label={me.data.access.isTrialActive ? `${ring}%` : '0%'}
                sublabel="remaining"
                size={96}
                stroke={9}
              />
            </div>
            <TrialCountdown
              trialEndsAt={me.data.access.trialEndsAt}
              isTrialActive={me.data.access.isTrialActive}
            />
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              {me.data.access.isTrialActive
                ? 'Answers and explanations are unlocked for the rest of your trial.'
                : 'You can still browse questions, options, PDFs, and news. Correct answers stay premium.'}
            </p>
            <Link href="/profile">
              <Button variant="outline" size="sm" className="rounded-full">
                Open profile
              </Button>
            </Link>
          </Surface>

          <Surface className="space-y-3 p-5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-[var(--highlight)]" aria-hidden />
              <h2 className="font-display text-base font-bold tracking-tight">Important updates</h2>
            </div>
            <ul className="space-y-2.5">
              <li className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] px-3.5 py-3 text-sm">
                <p className="font-semibold text-[var(--ink)]">
                  {me.data.access.isTrialActive ? 'Trial answers unlocked' : 'Trial ended'}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {me.data.access.isTrialActive
                    ? `Ends ${new Date(me.data.access.trialEndsAt).toLocaleString()}`
                    : 'Premium answers stay gated until subscription ships.'}
                </p>
              </li>
              {!me.data.study?.onboardingCompleted ? (
                <li className="rounded-[12px] border border-[var(--highlight)]/30 bg-[var(--highlight-soft)] px-3.5 py-3 text-sm">
                  <p className="font-semibold text-[var(--ink)]">Finish topic setup</p>
                  <p className="mt-0.5 text-xs text-[var(--muted)]">
                    Pick interests so we can suggest practice topics.
                  </p>
                  <Link
                    href="/onboarding"
                    className="mt-2 inline-flex text-xs font-bold text-[var(--highlight)] underline-offset-2 hover:underline"
                  >
                    Complete onboarding
                  </Link>
                </li>
              ) : null}
            </ul>
          </Surface>
        </div>
      </div>

      {/* Study analytics */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Surface className="space-y-4 p-6">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Study time analytics</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              From your browsing sessions (today, this week, all time).
            </p>
          </div>
          {analytics.isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : (
            <BarChart
              formatValue={formatStudyMinutes}
              emptyLabel="Start practicing to record study time."
              data={[
                { label: 'Today', value: daySec, color: 'var(--highlight)' },
                { label: 'This week', value: weekSec, color: 'var(--info)' },
                { label: 'All time', value: totalSec, color: 'var(--bg-inverse)' },
              ]}
            />
          )}
        </Surface>

        <Surface className="space-y-4 p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold tracking-tight">Your topics</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {preferred.length > 0
                  ? 'Interests saved on your account.'
                  : 'Live categories from the library.'}
              </p>
            </div>
            <Link
              href="/onboarding"
              className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
            >
              Update interests
            </Link>
          </div>
          {categories.isLoading ? (
            <Skeleton className="h-36 w-full" />
          ) : suggestions.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Categories will appear after seeding.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {suggestions.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/questions?categoryId=${cat.id}`}
                    className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] px-3.5 py-3 transition-colors hover:border-[var(--highlight)] hover:bg-white"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-display text-sm font-bold tracking-tight">
                        {cat.name}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {cat.children.length} subtopics
                      </span>
                    </span>
                    <Badge variant="outline">Practice</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

      {/* Recent activity from bookmarks */}
      <Surface className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold tracking-tight">Recent saves</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Latest bookmarked questions and documents.
            </p>
          </div>
          <Link href="/bookmarks">
            <Button variant="outline" size="sm" className="rounded-full">
              All bookmarks
            </Button>
          </Link>
        </div>

        {stats.isLoading ? <Skeleton className="h-24 w-full" /> : null}

        {!stats.isLoading &&
        (!stats.data ||
          (stats.data.recentQuestions.length === 0 && stats.data.recentDocuments.length === 0)) ? (
          <p className="rounded-[12px] border border-dashed border-[var(--line-strong)] bg-[var(--bg-desk)] px-4 py-8 text-center text-sm text-[var(--muted)]">
            No bookmarks yet — save questions or PDFs while you practice.
          </p>
        ) : null}

        {stats.data &&
        (stats.data.recentQuestions.length > 0 || stats.data.recentDocuments.length > 0) ? (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                Questions
              </h3>
              <ul className="divide-y divide-[var(--line)] rounded-[12px] border border-[var(--line)]">
                {stats.data.recentQuestions.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-[var(--muted)]">None yet</li>
                ) : (
                  stats.data.recentQuestions.slice(0, 5).map((item) => (
                    <li key={item.bookmarkId}>
                      <Link
                        href={`/questions/${item.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-[var(--brand-wash)]"
                      >
                        <span className="min-w-0 truncate font-semibold">{item.title}</span>
                        <Badge variant="outline">{item.difficulty}</Badge>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                Documents
              </h3>
              <ul className="divide-y divide-[var(--line)] rounded-[12px] border border-[var(--line)]">
                {stats.data.recentDocuments.length === 0 ? (
                  <li className="px-4 py-3 text-sm text-[var(--muted)]">None yet</li>
                ) : (
                  stats.data.recentDocuments.slice(0, 5).map((item) => (
                    <li key={item.bookmarkId}>
                      <Link
                        href={`/documents/${item.id}`}
                        className="block truncate px-4 py-3 text-sm font-semibold hover:bg-[var(--brand-wash)]"
                      >
                        {item.title}
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        ) : null}
      </Surface>
    </div>
  );
}
