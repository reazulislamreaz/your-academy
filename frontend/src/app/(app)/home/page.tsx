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
  Percent,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { useEffect } from 'react';
import { AccuracyDonut } from '@/components/dashboard/accuracy-donut';
import { BarChart } from '@/components/dashboard/bar-chart';
import { MetricTile } from '@/components/dashboard/metric-tile';
import { SubjectProgress } from '@/components/dashboard/subject-progress';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
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
import { cn } from '@/lib/utils';

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

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function SectionTitle({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="min-w-0 truncate font-display text-base font-bold tracking-tight text-[var(--ink)]">
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="shrink-0 text-xs font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
        >
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
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

  // Reliable scroll for sidebar "Recent results" → /home#exam-history
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const scrollToHash = () => {
      if (window.location.hash !== '#exam-history') return;
      document.getElementById('exam-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, [me.data?.id, stats.dataUpdatedAt]);

  if (me.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full rounded-[var(--radius-lg)]" />
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
  const savedCount =
    (stats.data?.questionBookmarks ?? 0) + (stats.data?.documentBookmarks ?? 0);
  const hour = new Date().getHours();
  const insight =
    perf.totalAttempts === 0
      ? 'Check your first answer to unlock accuracy and subject progress.'
      : perf.weekAttempts > 0
        ? `This week: ${perf.weekAttempts} checks · ${perf.weekAccuracyPercent}% accuracy.`
        : `Overall accuracy ${perf.accuracyPercent}% across ${perf.uniqueQuestions} questions.`;

  return (
    <div className="flex w-full flex-col gap-5 pb-10 sm:gap-6">
      {/* Welcome */}
      <Surface className="overflow-hidden border-l-[3px] border-l-[var(--highlight)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              Study desk
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-3xl">
              {greetingForHour(hour)}, {firstName}
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--muted)]">{insight}</p>
            <div className="mt-3">
              <TrialCountdown
                trialEndsAt={me.data.access.trialEndsAt}
                isTrialActive={me.data.access.isTrialActive}
              />
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Link href={last ? `/questions/${last.id}${last.filterQs ? `?${last.filterQs}` : ''}` : '/questions'} className="w-full sm:w-auto">
              <Button className="w-full rounded-full px-5 sm:w-auto">
                {last ? 'Resume practice' : 'Start practice'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/profile" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full rounded-full px-5 sm:w-auto">
                Account
              </Button>
            </Link>
          </div>
        </div>
        <p className="mt-3 text-xs text-[var(--muted)] sm:text-sm">
          {me.data.access.isTrialActive
            ? 'Answers and explanations stay unlocked for the rest of your trial.'
            : 'You can still browse, save, and practice — correct answers remain premium.'}
        </p>
      </Surface>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricTile
          label="Questions answered"
          value={perf.uniqueQuestions}
          icon={Target}
          tone="navy"
        />
        <MetricTile
          label="Accuracy"
          value={perf.accuracyPercent}
          suffix="%"
          icon={Percent}
          tone="green"
        />
        <MetricTile label="Correct" value={perf.correct} icon={CheckCircle2} tone="teal" />
        <MetricTile label="Incorrect" value={perf.incorrect} icon={XCircle} tone="red" />
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricTile
          label="Checks taken"
          value={perf.totalAttempts}
          icon={ClipboardList}
          tone="blue"
        />
        <MetricTile
          label="Week accuracy"
          value={perf.weekAccuracyPercent}
          suffix="%"
          icon={Percent}
          tone="amber"
        />
        <MetricTile label="Saved items" value={savedCount} icon={BookMarked} tone="navy" />
        <MetricTile
          label="Study time"
          value={formatStudyMinutes(totalSec)}
          icon={Clock3}
          tone="blue"
        />
      </div>

      {/* Continue + shortcuts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Surface className="space-y-4 p-4 sm:p-5 lg:col-span-3">
          <SectionTitle title="Continue where you left off" href="/questions" linkLabel="Question bank" />
          {last ? (
            <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)] p-4">
              <p className="text-xs font-medium tracking-wide text-[var(--muted)] uppercase">
                Last opened
              </p>
              <p className="mt-1 font-display text-lg font-bold tracking-tight text-[var(--ink)] break-words">
                {last.title}
              </p>
              {last.categoryName ? (
                <p className="mt-0.5 text-sm text-[var(--muted)]">{last.categoryName}</p>
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
            <EmptyState
              className="py-8"
              title="No practice history yet"
              description="Open any MCQ and press Check answer. Accuracy, subject progress, and recent results will appear here."
              action={
                <Link href="/questions">
                  <Button size="sm" className="rounded-full">
                    Browse questions
                  </Button>
                </Link>
              }
            />
          )}

          <div>
            <h3 className="mb-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
              Quick actions
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                {
                  href: '/questions',
                  title: 'MCQ practice',
                  desc: 'Filter by subject and check yourself',
                  icon: BookOpen,
                },
                {
                  href: '/questions?q=Model',
                  title: 'Model exams',
                  desc: 'Search model / exam-style sets',
                  icon: ClipboardList,
                },
                {
                  href: '/documents',
                  title: 'Previous papers',
                  desc: 'Published PDF library',
                  icon: FileText,
                },
                {
                  href: '/onboarding',
                  title: 'My topics',
                  desc: preferredIds.length
                    ? `${preferredIds.length} preferred subjects`
                    : 'Choose subjects for recommendations',
                  icon: Sparkles,
                },
              ].map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className="flex items-center gap-3 rounded-[10px] border border-transparent px-2.5 py-2.5 transition-colors hover:border-[var(--line)] hover:bg-[var(--bg-muted)]"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--highlight-soft)] text-[var(--highlight)]">
                    <item.icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[var(--ink)]">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-[var(--muted)]">{item.desc}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Surface>

        <Surface className="space-y-3 p-4 sm:p-5 lg:col-span-2">
          <SectionTitle title="Answer mix" />
          {stats.isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <AccuracyDonut correct={perf.correct} incorrect={perf.incorrect} />
          )}
        </Surface>
      </div>

      {/* Subject + study time */}
      <div className="grid gap-4 md:grid-cols-2">
        <Surface className="space-y-3 p-4 sm:p-5">
          <SectionTitle title="Subject performance" href="/onboarding" linkLabel="My topics" />
          {stats.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <SubjectProgress items={perf.byCategory} />
          )}
        </Surface>

        <Surface className="space-y-3 p-4 sm:p-5">
          <SectionTitle title="Study time" />
          {analytics.isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <BarChart
              formatValue={formatStudyMinutes}
              emptyLabel="Study time appears while you browse with this account signed in."
              data={[
                { label: 'Today', value: daySec, color: 'var(--highlight)' },
                { label: 'This week', value: weekSec, color: 'var(--info)' },
                { label: 'All time', value: totalSec, color: 'var(--bg-inverse)' },
              ]}
            />
          )}
        </Surface>
      </div>

      {/* Results + topics */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Surface id="exam-history" className="scroll-mt-24 space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate font-display text-base font-bold tracking-tight text-[var(--ink)]">
              Recent results
            </h2>
            <Badge variant="outline" className="shrink-0">
              {perf.recentAttempts.length} shown
            </Badge>
          </div>
          {stats.isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {!stats.isLoading && perf.recentAttempts.length === 0 ? (
            <EmptyState
              className="py-8"
              title="No checks yet"
              description="Results appear after you press Check answer on a practice question."
              action={
                <Link href="/questions">
                  <Button size="sm" variant="soft" className="rounded-full">
                    Start a check
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {perf.recentAttempts.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/questions/${item.questionId}`}
                    className="flex items-center justify-between gap-3 rounded-[8px] px-1.5 py-2.5 hover:bg-[var(--bg-muted)]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-[8px]',
                          item.isCorrect
                            ? 'bg-[var(--success-soft)] text-[var(--success)]'
                            : 'bg-[var(--highlight-soft)] text-[var(--highlight)]',
                        )}
                      >
                        {item.isCorrect ? (
                          <CheckCircle2 className="size-4" aria-hidden />
                        ) : (
                          <XCircle className="size-4" aria-hidden />
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-[var(--ink)]">
                          {item.title}
                        </span>
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
          <SectionTitle
            title={preferredIds.length ? 'Your topics' : 'Recommended topics'}
            href="/onboarding"
            linkLabel="Update"
          />
          {categories.isLoading ? <Skeleton className="h-40 w-full" /> : null}
          {!categories.isLoading && suggestions.length === 0 ? (
            <EmptyState
              className="py-8"
              title="No categories yet"
              description="Topics appear once the question bank has published categories."
            />
          ) : (
            <ul className="space-y-1">
              {suggestions.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/questions?categoryId=${cat.id}`}
                    className="flex items-center justify-between gap-3 rounded-[8px] px-1.5 py-2 hover:bg-[var(--bg-muted)]"
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
          <SectionTitle title="Updates & circulars" href="/news" linkLabel="All news" />
          {news.isLoading ? <Skeleton className="h-32 w-full" /> : null}
          {!news.isLoading && newsItems.length === 0 ? (
            <EmptyState
              className="py-8"
              title="No published news"
              description="Exam notices and circulars will show up here when published."
            />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {newsItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/news/${item.slug}`}
                    className="block min-w-0 rounded-[8px] px-1.5 py-2.5 hover:bg-[var(--bg-muted)]"
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
          <SectionTitle title="Saved for later" href="/bookmarks" linkLabel="View all" />
          {stats.isLoading ? <Skeleton className="h-32 w-full" /> : null}
          {!stats.isLoading &&
          (!stats.data ||
            (stats.data.recentQuestions.length === 0 &&
              stats.data.recentDocuments.length === 0)) ? (
            <EmptyState
              className="py-8"
              title="Nothing saved yet"
              description="Bookmark questions or PDFs while you practice — they land here."
              action={
                <Link href="/questions">
                  <Button size="sm" variant="soft" className="rounded-full">
                    Browse questions
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {(stats.data?.recentQuestions ?? []).slice(0, 4).map((item) => (
                <li key={item.bookmarkId}>
                  <Link
                    href={`/questions/${item.id}`}
                    className="flex min-w-0 items-center justify-between gap-3 px-1.5 py-2.5 hover:bg-[var(--bg-muted)]"
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
                    className="block truncate px-1.5 py-2.5 text-sm font-medium hover:bg-[var(--bg-muted)]"
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
