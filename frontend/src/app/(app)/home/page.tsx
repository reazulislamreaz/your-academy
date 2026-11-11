'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Clock3,
  FileText,
  Library,
  Percent,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';
import { AccuracyDonut } from '@/components/dashboard/accuracy-donut';
import { BarChart } from '@/components/dashboard/bar-chart';
import { MetricTile } from '@/components/dashboard/metric-tile';
import { SubjectProgress } from '@/components/dashboard/subject-progress';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { TrialCountdown } from '@/features/auth/trial-countdown';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';
import { apiFetch } from '@/lib/api/client';
import type {
  AnalyticsSummary,
  CategoryNode,
  NewsListItem,
  UserStats,
} from '@/lib/api/types';
import { formatStudyMinutes } from '@/lib/study-prefs';

function emptyPerformance(): UserStats['performance'] {
  return {
    totalAttempts: 0,
    uniqueQuestions: 0,
    correct: 0,
    incorrect: 0,
    accuracyPercent: 0,
    weekAttempts: 0,
    weekCorrect: 0,
    weekAccuracyPercent: 0,
    byCategory: [],
    recentAttempts: [],
  };
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

  const news = useQuery({
    queryKey: ['news-home'],
    queryFn: () => apiFetch<NewsListItem[]>('/news'),
    enabled: Boolean(me.data),
  });

  if (me.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (isUnauthorized(me.error) || !me.data) {
    return (
      <Alert variant="warning">
        Sign in to open your dashboard.{' '}
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
  const perf = stats.data?.performance ?? emptyPerformance();
  const daySec = analytics.data?.daySeconds ?? 0;
  const weekSec = analytics.data?.weekSeconds ?? 0;
  const totalSec = analytics.data?.totalSeconds ?? stats.data?.browsingSeconds ?? 0;
  const newsItems = (news.data ?? []).slice(0, 4);

  return (
    <div className="flex w-full flex-col gap-6 pb-8">
      {/* Welcome */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl md:text-3xl">
            Welcome back, {firstName}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
            Your progress, exam results, and quick practice options in one place.
          </p>
        </div>
        <Link href="/questions" className="w-full sm:w-auto">
          <Button className="w-full rounded-full px-5 sm:w-auto">
            Start practice
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>

      {/* Membership strip */}
      <Surface className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <TrialCountdown
          trialEndsAt={me.data.access.trialEndsAt}
          isTrialActive={me.data.access.isTrialActive}
        />
        <p className="text-xs text-[var(--muted)] sm:text-sm">
          {me.data.access.isTrialActive
            ? 'Answers unlocked for your remaining trial.'
            : 'Browsing stays open — correct answers remain premium.'}
        </p>
        <Link href="/profile" className="text-sm font-semibold text-[var(--highlight)] hover:underline">
          Account settings
        </Link>
      </Surface>

      {/* Metric tiles — QBook style */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Questions answered"
          value={perf.uniqueQuestions}
          icon={Target}
          tone="blue"
        />
        <MetricTile
          label="Accuracy"
          value={perf.accuracyPercent}
          suffix="%"
          icon={Percent}
          tone="green"
        />
        <MetricTile
          label="Checks taken"
          value={perf.totalAttempts}
          icon={ClipboardList}
          tone="purple"
        />
        <MetricTile
          label="Week accuracy"
          value={perf.weekAccuracyPercent}
          suffix="%"
          icon={Trophy}
          tone="amber"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricTile
          label="Correct"
          value={perf.correct}
          icon={CheckCircle2}
          tone="green"
        />
        <MetricTile label="Incorrect" value={perf.incorrect} icon={XCircle} tone="red" />
        <MetricTile
          label="Saved items"
          value={(stats.data?.questionBookmarks ?? 0) + (stats.data?.documentBookmarks ?? 0)}
          icon={BookMarked}
          tone="navy"
        />
        <MetricTile
          label="Study time"
          value={formatStudyMinutes(totalSec)}
          icon={Clock3}
          tone="blue"
        />
      </div>

      {/* Continue + quick practice */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Surface className="space-y-4 p-4 sm:p-5 md:col-span-2 xl:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
              Continue practice
            </h2>
            <Link
              href="/questions"
              className="shrink-0 text-xs font-semibold text-[var(--highlight)] hover:underline"
            >
              Question bank
            </Link>
          </div>
          {last ? (
            <div className="min-w-0 rounded-lg border border-[var(--line)] bg-[var(--bg-desk)] p-4">
              <p className="text-xs text-[var(--muted)]">Last opened</p>
              <p className="mt-1 break-words font-display text-lg font-bold tracking-tight">
                {last.title}
              </p>
              {last.categoryName ? (
                <p className="mt-0.5 truncate text-sm text-[var(--muted)]">{last.categoryName}</p>
              ) : null}
              <Link
                href={`/questions/${last.id}${last.filterQs ? `?${last.filterQs}` : ''}`}
                className="mt-3 inline-flex"
              >
                <Button size="sm" className="rounded-full">
                  Resume
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-[var(--line-strong)] p-4 text-sm text-[var(--muted)]">
              Open any MCQ and press Check answer to build history and accuracy here.
              <div className="mt-3">
                <Link href="/questions">
                  <Button size="sm" className="rounded-full">
                    Browse questions
                  </Button>
                </Link>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
              Quick practice
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  href: '/questions',
                  title: 'MCQ practice',
                  desc: 'Timed self-check in the bank',
                  icon: BookOpen,
                },
                {
                  href: '/questions',
                  title: 'Question bank',
                  desc: 'Subject & topic filters',
                  icon: Library,
                },
                {
                  href: '/documents',
                  title: 'Previous papers',
                  desc: 'Published PDF library',
                  icon: FileText,
                },
                {
                  href: '/questions?q=Model',
                  title: 'Model exam practice',
                  desc: 'Search model / exam sets',
                  icon: ClipboardList,
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--bg-muted)]"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-[var(--highlight-soft)] text-[var(--highlight)]">
                    <item.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-[var(--ink)]">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-[var(--muted)]">{item.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Surface>

        <Surface className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Answer mix</h2>
          <AccuracyDonut correct={perf.correct} incorrect={perf.incorrect} />
        </Surface>
      </div>

      {/* Subject progress + study time */}
      <div className="grid gap-4 md:grid-cols-2">
        <Surface className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
              Subject performance
            </h2>
            <Link
              href="/onboarding"
              className="shrink-0 text-xs font-semibold text-[var(--highlight)] hover:underline"
            >
              My topics
            </Link>
          </div>
          {stats.isLoading ? <Skeleton className="h-40 w-full" /> : <SubjectProgress items={perf.byCategory} />}
        </Surface>

        <Surface className="space-y-3 p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-[var(--ink)]">Study time</h2>
          {analytics.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BarChart
              formatValue={formatStudyMinutes}
              emptyLabel="Study time appears while you browse with this account."
              data={[
                { label: 'Today', value: daySec, color: 'var(--highlight)' },
                { label: 'This week', value: weekSec, color: 'var(--info)' },
                { label: 'All time', value: totalSec, color: 'var(--bg-inverse)' },
              ]}
            />
          )}
        </Surface>
      </div>

      {/* Exam history + topics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface id="exam-history" className="scroll-mt-24 space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
              Exam history & results
            </h2>
            <Badge variant="outline" className="shrink-0">
              {perf.recentAttempts.length} recent
            </Badge>
          </div>
          {stats.isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {!stats.isLoading && perf.recentAttempts.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]">
              No checks yet. Results appear after you press Check answer.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {perf.recentAttempts.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/questions/${item.questionId}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2.5 hover:bg-[var(--bg-muted)]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex size-8 shrink-0 items-center justify-center rounded-md ${
                          item.isCorrect
                            ? 'bg-[var(--success-soft)] text-[var(--success)]'
                            : 'bg-[var(--highlight-soft)] text-[var(--highlight)]'
                        }`}
                      >
                        {item.isCorrect ? (
                          <CheckCircle2 className="size-4" aria-hidden />
                        ) : (
                          <XCircle className="size-4" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{item.title}</span>
                        <span className="block truncate text-xs text-[var(--muted)]">
                          {item.categoryName} · {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </span>
                    </span>
                    <Badge variant={item.isCorrect ? 'success' : 'danger'} className="shrink-0">
                      {item.isCorrect ? 'Correct' : 'Wrong'}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
              Recommended topics
            </h2>
            <Link
              href="/onboarding"
              className="shrink-0 text-xs font-semibold text-[var(--highlight)] hover:underline"
            >
              Update
            </Link>
          </div>
          {categories.isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {!categories.isLoading && suggestions.length === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--muted)]">No categories yet.</p>
          ) : (
            <ul className="space-y-1">
              {suggestions.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/questions?categoryId=${cat.id}`}
                    className="flex items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-[var(--bg-muted)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--ink)]">
                        {cat.name}
                      </span>
                      <span className="text-xs text-[var(--muted)]">
                        {cat.children.length} subtopics
                      </span>
                    </span>
                    <Badge variant="outline" className="shrink-0">
                      Practice
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>

      {/* News + bookmarks */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="space-y-3 overflow-hidden p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
              Notifications & updates
            </h2>
            <Link
              href="/news"
              className="shrink-0 text-xs font-semibold text-[var(--highlight)] hover:underline"
            >
              All news
            </Link>
          </div>
          {news.isLoading ? <Skeleton className="h-32 w-full" /> : null}
          {!news.isLoading && newsItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">No published news yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {newsItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/news/${item.slug}`}
                    className="block min-w-0 rounded-md px-2 py-2.5 hover:bg-[var(--bg-muted)]"
                  >
                    <p className="truncate text-sm font-medium text-[var(--ink)]">{item.title}</p>
                    {item.summary ? (
                      <p className="mt-0.5 line-clamp-2 break-words text-xs text-[var(--muted)]">
                        {item.summary}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="space-y-3 overflow-hidden p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate text-sm font-semibold text-[var(--ink)]">
              Saved / bookmarked
            </h2>
            <Link
              href="/bookmarks"
              className="shrink-0 text-xs font-semibold text-[var(--highlight)] hover:underline"
            >
              View all
            </Link>
          </div>
          {stats.isLoading ? <Skeleton className="h-32 w-full" /> : null}
          {!stats.isLoading &&
          (!stats.data ||
            (stats.data.recentQuestions.length === 0 &&
              stats.data.recentDocuments.length === 0)) ? (
            <p className="py-8 text-center text-sm text-[var(--muted)]">
              Save questions or PDFs while practicing.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {(stats.data?.recentQuestions ?? []).slice(0, 4).map((item) => (
                <li key={item.bookmarkId}>
                  <Link
                    href={`/questions/${item.id}`}
                    className="flex min-w-0 items-center justify-between gap-3 px-2 py-2.5 hover:bg-[var(--bg-muted)]"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{item.title}</span>
                    <Badge variant="outline" className="shrink-0">
                      {item.difficulty}
                    </Badge>
                  </Link>
                </li>
              ))}
              {(stats.data?.recentDocuments ?? []).slice(0, 3).map((item) => (
                <li key={item.bookmarkId}>
                  <Link
                    href={`/documents/${item.id}`}
                    className="block truncate px-2 py-2.5 text-sm font-medium hover:bg-[var(--bg-muted)]"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </div>
    </div>
  );
}
