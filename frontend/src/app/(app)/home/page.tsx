'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Sparkles,
  Target,
  Timer,
  XCircle,
} from 'lucide-react';
import { useEffect } from 'react';
import { AccuracyDonut } from '@/components/dashboard/accuracy-donut';
import { BarChart } from '@/components/dashboard/bar-chart';
import { HomeStatCard } from '@/components/dashboard/home-stat-card';
import { ProgressRing } from '@/components/dashboard/progress-ring';
import { QuickLink } from '@/components/dashboard/quick-link';
import { SubjectProgress } from '@/components/dashboard/subject-progress';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  HomeActivityListSkeleton,
  HomeAnswerMixSkeleton,
  HomePageSkeleton,
  HomeStudyTimeSkeleton,
  HomeSubjectProgressSkeleton,
} from '@/components/skeletons';
import { ContentIn } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';
import { apiFetch } from '@/lib/api/client';
import type {
  AnalyticsSummary,
  CategoryNode,
  NewsListItem,
  UserStats,
} from '@/lib/api/types';
import { formatStudyHours, formatStudyMinutes } from '@/lib/study-prefs';
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
      <h2 className="min-w-0 truncate font-display text-[0.9375rem] font-bold tracking-tight text-[var(--ink)] sm:text-base">
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

function TrendPill({ children, muted }: { children: string; muted?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold',
        muted
          ? 'bg-[var(--bg-muted)] text-[var(--muted-strong)]'
          : 'bg-[var(--success-soft)] text-[var(--success-fg)]',
      )}
    >
      {children}
    </span>
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
    return <HomePageSkeleton />;
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

  const displayName = me.data.name;
  const last = me.data.study?.lastQuestion ?? null;
  const preferredIds = me.data.study?.preferredCategoryIds ?? [];
  const preferred =
    categories.data?.filter((c) => preferredIds.includes(c.id)).slice(0, 6) ?? [];
  const suggestions =
    preferred.length > 0 ? preferred : (categories.data?.slice(0, 6) ?? []);
  const statsFailed = stats.isError;
  const analyticsFailed = analytics.isError;
  const perf = stats.data?.performance ?? emptyPerformance();
  const daySec = analytics.data?.daySeconds ?? 0;
  const weekSec = analytics.data?.weekSeconds ?? 0;
  const totalSec = analytics.data?.totalSeconds ?? stats.data?.browsingSeconds ?? 0;
  const newsItems = (news.data ?? []).slice(0, 4);
  const weekHoursLabel = formatStudyHours(weekSec).replace(' hrs', '').replace(' min', 'm');
  const resumeHref = last
    ? `/questions/${last.id}${last.filterQs ? `?${last.filterQs}` : ''}`
    : '/questions';

  return (
    <div className="flex w-full flex-col gap-7 pb-10 sm:gap-8">
      {/* Welcome */}
      <div className="motion-rise flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="flex items-center gap-2.5 text-[0.6875rem] font-semibold tracking-[0.16em] text-[var(--highlight)] uppercase">
            <span aria-hidden className="inline-block h-1 w-6 shrink-0 rounded-full bg-[var(--highlight)]" />
            Study desk
          </p>
          <h1 className="font-display text-[clamp(1.75rem,4vw,2.25rem)] font-bold tracking-tight text-[var(--ink)]">
            Welcome back, {displayName}
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-[var(--muted-strong)] sm:text-[0.9375rem]">
            Track your progress and practice every day. Your answers and folders stay private to this
            account.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <Link href={resumeHref} className="w-full sm:w-auto">
            <Button className="w-full px-5 sm:w-auto">
              {last ? 'Resume practice' : 'Start practice'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/profile" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full px-5 sm:w-auto">
              Account
            </Button>
          </Link>
        </div>
      </div>

      {statsFailed || analyticsFailed ? (
        <Alert variant="danger">
          {statsFailed && analyticsFailed
            ? 'Could not load practice stats or study time.'
            : statsFailed
              ? 'Could not load practice stats.'
              : 'Could not load study-time summary.'}{' '}
          Refresh the page to try again.
        </Alert>
      ) : null}

      {!statsFailed ? (
        <div className="motion-stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <HomeStatCard
            icon={ClipboardCheck}
            value={perf.uniqueQuestions.toLocaleString()}
            label="MCQs Solved"
            subtitle="Unique questions you have checked"
            footer={
              <TrendPill muted={perf.weekAttempts === 0}>
                {perf.weekAttempts > 0
                  ? `+${perf.weekAttempts.toLocaleString()} this week`
                  : 'No checks this week'}
              </TrendPill>
            }
          />

          <HomeStatCard
            icon={Target}
            iconClassName="text-[var(--highlight)]"
            value={`${perf.accuracyPercent}%`}
            label="Success Rate"
            footer={
              <div className="flex justify-start">
                <ProgressRing
                  value={perf.accuracyPercent}
                  size={84}
                  stroke={8}
                  label={`${perf.accuracyPercent}%`}
                  color="var(--ink)"
                  trackColor="var(--line)"
                />
              </div>
            }
          />

          <HomeStatCard
            icon={Timer}
            value={analyticsFailed ? '—' : formatStudyHours(totalSec)}
            label="Study Time"
            className="sm:col-span-2 xl:col-span-1"
            footer={
              <TrendPill muted={analyticsFailed || weekSec === 0}>
                {analyticsFailed
                  ? 'Study time unavailable'
                  : weekSec > 0
                    ? `+${weekHoursLabel} this week`
                    : 'No study time this week'}
              </TrendPill>
            }
          />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <Surface elevated className="space-y-5 p-4 sm:p-5 lg:col-span-3">
          <SectionTitle title="Continue where you left off" href="/questions" linkLabel="Question bank" />
          {last ? (
            <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)] p-4">
              <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Last opened
              </p>
              <p className="mt-1.5 font-display text-lg font-bold tracking-tight text-[var(--ink)] break-words">
                {last.title}
              </p>
              {last.categoryName ? (
                <p className="mt-0.5 text-sm text-[var(--muted-strong)]">{last.categoryName}</p>
              ) : null}
              <Link href={resumeHref} className="mt-3 inline-flex">
                <Button size="sm">
                  Resume
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <EmptyState
              nested
              className="py-8"
              title="No practice history yet"
              description="Open any MCQ and press Check answer. Accuracy, subject progress, and recent results will appear here."
              action={
                <Link href="/questions">
                  <Button size="sm">Browse questions</Button>
                </Link>
              }
            />
          )}

          <div>
            <h3 className="mb-3 text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              Quick actions
            </h3>
            <div className="grid gap-2.5 sm:grid-cols-2">
              <QuickLink
                href="/questions"
                title="Question bank"
                description="Subject, topic, and exam-track MCQs"
                icon={BookOpen}
              />
              <QuickLink
                href="/model-tests"
                title="Model tests"
                description="Timed mocks with score review"
                icon={ClipboardList}
              />
              <QuickLink
                href="/exams"
                title="Govt job prep"
                description="BCS, bank, NTRCA, and more"
                icon={FileText}
              />
              <QuickLink
                href="/quizzes"
                title="Quiz center"
                description={
                  preferredIds.length
                    ? `${preferredIds.length} preferred subjects ready`
                    : 'Daily, subject, and topic quizzes'
                }
                icon={Sparkles}
              />
            </div>
          </div>
        </Surface>

        <Surface elevated className="space-y-3 p-4 sm:p-5 lg:col-span-2">
          <SectionTitle title="Answer mix" />
          {stats.isLoading ? (
            <HomeAnswerMixSkeleton />
          ) : (
            <ContentIn>
              <AccuracyDonut correct={perf.correct} incorrect={perf.incorrect} />
            </ContentIn>
          )}
        </Surface>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Surface elevated className="space-y-3 p-4 sm:p-5">
          <SectionTitle title="Subject performance" href="/onboarding" linkLabel="My topics" />
          {stats.isLoading ? (
            <HomeSubjectProgressSkeleton />
          ) : (
            <ContentIn>
              <SubjectProgress items={perf.byCategory} />
            </ContentIn>
          )}
        </Surface>

        <Surface elevated className="space-y-3 p-4 sm:p-5">
          <SectionTitle title="Study time" />
          {analytics.isLoading ? (
            <HomeStudyTimeSkeleton />
          ) : (
            <ContentIn>
              <BarChart
                formatValue={formatStudyMinutes}
                emptyLabel="Study time appears while you browse with this account signed in."
                data={[
                  { label: 'Today', value: daySec, color: 'var(--highlight)' },
                  { label: 'This week', value: weekSec, color: 'var(--info)' },
                  { label: 'All time', value: totalSec, color: 'var(--bg-inverse)' },
                ]}
              />
            </ContentIn>
          )}
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface id="exam-history" elevated className="scroll-mt-24 space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="min-w-0 truncate font-display text-[0.9375rem] font-bold tracking-tight text-[var(--ink)] sm:text-base">
              Recent answer checks
            </h2>
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/results"
                className="text-xs font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              >
                Quiz results
              </Link>
              <Badge variant="outline">{perf.recentAttempts.length} shown</Badge>
            </div>
          </div>
          {statsFailed ? <Alert variant="danger">Could not load recent checks.</Alert> : null}
          {stats.isLoading ? <HomeActivityListSkeleton rows={4} /> : null}
          {!stats.isLoading && !statsFailed && perf.recentAttempts.length === 0 ? (
            <EmptyState
              nested
              className="py-8"
              title="No checks yet"
              description="Results appear after you press Check answer on a practice question."
              action={
                <Link href="/questions">
                  <Button size="sm" variant="soft">
                    Start a check
                  </Button>
                </Link>
              }
            />
          ) : null}
          {!stats.isLoading && !statsFailed && perf.recentAttempts.length > 0 ? (
            <ul className="divide-y divide-[var(--line)]">
              {perf.recentAttempts.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/questions/${item.questionId}`}
                    className="flex items-center justify-between gap-3 rounded-[10px] px-1.5 py-2.5 transition-colors hover:bg-[var(--bg-muted)]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-[10px]',
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
                        <span className="block truncate text-xs text-[var(--muted-strong)]">
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
          ) : null}
        </Surface>

        <Surface elevated className="space-y-3 p-4 sm:p-5">
          <SectionTitle
            title={preferredIds.length ? 'Your topics' : 'Recommended topics'}
            href="/onboarding"
            linkLabel="Update"
          />
          {categories.isLoading ? <HomeActivityListSkeleton rows={4} /> : null}
          {!categories.isLoading && suggestions.length === 0 ? (
            <EmptyState
              nested
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
                    className="flex items-center justify-between gap-3 rounded-[10px] px-1.5 py-2 transition-colors hover:bg-[var(--bg-muted)]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-[var(--ink)]">
                        {cat.name}
                      </span>
                      <span className="text-xs text-[var(--muted-strong)]">
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface elevated className="space-y-3 overflow-hidden p-4 sm:p-5">
          <SectionTitle title="Updates & circulars" href="/news" linkLabel="All news" />
          {news.isLoading ? <HomeActivityListSkeleton rows={3} /> : null}
          {!news.isLoading && newsItems.length === 0 ? (
            <EmptyState
              nested
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
                    className="block min-w-0 rounded-[10px] px-1.5 py-2.5 transition-colors hover:bg-[var(--bg-muted)]"
                  >
                    <p className="truncate text-sm font-medium text-[var(--ink)]">{item.title}</p>
                    {item.summary ? (
                      <p className="mt-0.5 line-clamp-2 break-words text-xs text-[var(--muted-strong)]">
                        {item.summary}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface elevated className="space-y-3 overflow-hidden p-4 sm:p-5">
          <SectionTitle title="Saved for later" href="/bookmarks" linkLabel="View all" />
          {stats.isLoading ? <HomeActivityListSkeleton rows={3} /> : null}
          {!stats.isLoading &&
          (!stats.data ||
            (stats.data.recentQuestions.length === 0 &&
              stats.data.recentDocuments.length === 0)) ? (
            <EmptyState
              nested
              className="py-8"
              title="Nothing saved yet"
              description="Bookmark questions or PDFs while you practice — they land here."
              action={
                <Link href="/questions">
                  <Button size="sm" variant="soft">
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
                    className="flex min-w-0 items-center justify-between gap-3 rounded-[10px] px-1.5 py-2.5 transition-colors hover:bg-[var(--bg-muted)]"
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
                    className="block truncate rounded-[10px] px-1.5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--bg-muted)]"
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
