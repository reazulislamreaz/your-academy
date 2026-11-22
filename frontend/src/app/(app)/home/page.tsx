'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpenText,
  ClipboardCheck,
  ClipboardList,
  FilePenLine,
  Flame,
  Folders,
  Layers3,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { AccuracyDonut } from '@/components/dashboard/accuracy-donut';
import { BarChart } from '@/components/dashboard/bar-chart';
import { DashboardWelcomeBanner } from '@/components/dashboard/dashboard-welcome-banner';
import { MetricTile } from '@/components/dashboard/metric-tile';
import { QuickLink } from '@/components/dashboard/quick-link';
import { RecentExamAttempts } from '@/components/dashboard/recent-exam-attempts';
import { RecommendedExams } from '@/components/dashboard/recommended-exams';
import { SubjectProgress } from '@/components/dashboard/subject-progress';
import { LoadError } from '@/components/loading';
import { Reveal } from '@/components/motion/reveal';
import { Stagger } from '@/components/motion/stagger';
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
import { listPublicExams } from '@/lib/api/exams';
import { apiFetch } from '@/lib/api/client';
import type {
  AnalyticsSummary,
  CategoryNode,
  ExamPerformance,
  NewsListItem,
  PracticeSetListItem,
  UserStats,
} from '@/lib/api/types';
import { formatStudyHours, formatStudyMinutes } from '@/lib/study-prefs';

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
    <div className="flex min-w-0 items-start justify-between gap-2 sm:items-center">
      <h2 className="min-w-0 text-pretty break-words text-[0.9375rem] font-semibold tracking-tight text-[var(--ink)] sm:text-base">
        {title}
      </h2>
      {href && linkLabel ? (
        <Link
          href={href}
          className="shrink-0 text-xs font-semibold whitespace-nowrap text-[var(--muted)] underline-offset-2 hover:text-[var(--ink)] hover:underline"
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
    staleTime: 30_000,
  });

  const examPerf = useQuery({
    queryKey: ['exam-performance'],
    queryFn: () => apiFetch<ExamPerformance>('/me/exam-performance'),
    enabled: Boolean(me.data),
    staleTime: 30_000,
  });

  const analytics = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => apiFetch<AnalyticsSummary>('/analytics/me/summary'),
    enabled: Boolean(me.data),
    staleTime: 30_000,
  });

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
    enabled: Boolean(me.data),
    staleTime: 60_000,
  });

  const news = useQuery({
    queryKey: ['news', 'home'],
    queryFn: () => apiFetch<NewsListItem[]>('/news'),
    enabled: Boolean(me.data),
    staleTime: 60_000,
  });

  const practiceSets = useQuery({
    queryKey: ['practice-sets', 'home-recommended'],
    queryFn: () => apiFetch<PracticeSetListItem[]>('/practice-sets?limit=6'),
    enabled: Boolean(me.data),
    staleTime: 60_000,
  });

  const publicExams = useQuery({
    queryKey: ['public-exams', 'home'],
    queryFn: async () => (await listPublicExams({ limit: 6 })).data,
    enabled: Boolean(me.data),
    staleTime: 60_000,
  });

  if (me.isLoading && !me.data) {
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
  const exams = examPerf.data ?? stats.data?.examPerformance ?? null;
  const daySec = analytics.data?.daySeconds ?? 0;
  const weekSec = analytics.data?.weekSeconds ?? 0;
  const totalSec = analytics.data?.totalSeconds ?? stats.data?.browsingSeconds ?? 0;
  const newsItems = (news.data ?? []).slice(0, 4);
  const resumeHref = last
    ? `/questions/${last.id}${last.filterQs ? `?${last.filterQs}` : ''}`
    : '/preliminary';

  const progressLine =
    exams && exams.totalExamsCompleted > 0
      ? `${exams.totalExamsCompleted} exam${exams.totalExamsCompleted === 1 ? '' : 's'} completed · avg ${exams.averageExamScorePercent}% · ${perf.accuracyPercent}% MCQ accuracy`
      : perf.weekAttempts > 0
        ? `You checked ${perf.weekAttempts.toLocaleString()} MCQ${perf.weekAttempts === 1 ? '' : 's'} this week · ${perf.accuracyPercent}% overall accuracy`
        : perf.uniqueQuestions > 0
          ? `${perf.uniqueQuestions.toLocaleString()} unique MCQs practiced · ${perf.accuracyPercent}% accuracy`
          : 'Start a quiz or live exam to unlock progress here.';

  return (
    <div className="flex w-full min-w-0 flex-col gap-5 pb-8 sm:gap-6 md:gap-7">
      <Reveal>
        <DashboardWelcomeBanner
          displayName={displayName}
          progressLine={progressLine}
          primaryHref={resumeHref}
          primaryLabel={last ? 'Resume practice' : 'Start practicing'}
        />
      </Reveal>

      {statsFailed || analyticsFailed || examPerf.isError ? (
        <LoadError
          message="Could not load some dashboard stats. Retry to refresh."
          onRetry={() => {
            void stats.refetch();
            void analytics.refetch();
            void examPerf.refetch();
          }}
        />
      ) : null}

      {!statsFailed ? (
        <Reveal delayMs={30}>
          <Stagger
            className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 lg:gap-4"
            stepMs={55}
          >
            <MetricTile
              icon={ClipboardCheck}
              tone="navy"
              value={exams?.totalExamsCompleted ?? 0}
              label="Exams completed"
            />
            <MetricTile
              icon={Trophy}
              tone="amber"
              value={exams?.averageExamScorePercent ?? 0}
              suffix="%"
              label="Average exam score"
            />
            <MetricTile
              icon={Target}
              tone="green"
              value={perf.accuracyPercent}
              suffix="%"
              label="MCQ accuracy"
            />
            <MetricTile
              icon={Flame}
              tone="red"
              value={perf.weekAttempts}
              label="Checks this week"
            />
          </Stagger>
        </Reveal>
      ) : null}

      <Reveal delayMs={50}>
        <RecentExamAttempts recentExams={exams?.recentExams ?? []} />
      </Reveal>

      <Reveal delayMs={70}>
        <RecommendedExams
          practiceSets={practiceSets.data ?? []}
          publicExams={publicExams.data ?? []}
          loading={practiceSets.isLoading || publicExams.isLoading}
        />
      </Reveal>

      <Reveal delayMs={80} className="grid gap-4 lg:grid-cols-5">
        <Surface elevated className="space-y-5 overflow-x-clip p-3.5 sm:p-5 lg:col-span-3">
          <SectionTitle title="Continue practice" href="/preliminary" linkLabel="Preliminary" />
          {last ? (
            <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/50 p-4">
              <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Last opened
              </p>
              <p className="mt-1.5 text-lg font-semibold tracking-tight break-words text-[var(--ink)]">
                {last.title}
              </p>
              {last.categoryName ? (
                <p className="mt-0.5 text-sm text-[var(--muted)]">{last.categoryName}</p>
              ) : null}
              <Link href={resumeHref} className="mt-3 inline-flex">
                <Button size="sm">Resume</Button>
              </Link>
            </div>
          ) : (
            <EmptyState
              nested
              className="py-8"
              title="No practice history yet"
              description="Open any MCQ and press Check answer. Accuracy and subject progress will appear here."
              action={
                <Link href="/preliminary">
                  <Button size="sm">Browse preliminary</Button>
                </Link>
              }
            />
          )}

          <div>
            <h3 className="mb-3 text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
              Quick access
            </h3>
            <Stagger className="grid gap-2.5 sm:grid-cols-2" stepMs={55}>
              <QuickLink
                href="/quizzes"
                title="Quiz"
                description="Daily, subject, and topic quizzes"
                icon={Sparkles}
              />
              <QuickLink
                href="/live-quizzes"
                title="Exams"
                description="Timed public exams with score review"
                icon={ClipboardList}
              />
              <QuickLink
                href="/live-model-tests"
                title="Model Tests"
                description="Full-length timed mocks"
                icon={Layers3}
              />
              <QuickLink
                href="/preliminary"
                title="Preli Practice"
                description="Timed practice from preliminary MCQ sets"
                icon={BookOpenText}
              />
              <QuickLink
                href="/written"
                title="Written Questions"
                description="Written exam collections by topic"
                icon={FilePenLine}
              />
              <QuickLink
                href="/topics"
                title="Topic-Based Questions"
                description="Browse Topic Base folders and sets"
                icon={Folders}
              />
            </Stagger>
          </div>
        </Surface>

        <Surface elevated className="space-y-3 overflow-x-clip p-3.5 sm:p-5 lg:col-span-2">
          <SectionTitle title="Answer mix" />
          {stats.isLoading ? (
            <HomeAnswerMixSkeleton />
          ) : (
            <ContentIn>
              <AccuracyDonut correct={perf.correct} incorrect={perf.incorrect} />
            </ContentIn>
          )}
        </Surface>
      </Reveal>

      <Reveal delayMs={90} className="grid gap-4 md:grid-cols-2">
        <Surface elevated className="space-y-3 overflow-x-clip p-3.5 sm:p-5">
          <SectionTitle title="Subject performance" href="/onboarding" linkLabel="My topics" />
          {stats.isLoading ? (
            <HomeSubjectProgressSkeleton />
          ) : (
            <ContentIn>
              <SubjectProgress items={perf.byCategory} />
            </ContentIn>
          )}
        </Surface>

        <Surface elevated className="space-y-3 overflow-x-clip p-3.5 sm:p-5">
          <SectionTitle title="Study time" />
          {analytics.isLoading ? (
            <HomeStudyTimeSkeleton />
          ) : (
            <ContentIn>
              <BarChart
                formatValue={formatStudyMinutes}
                emptyLabel="Study time appears while you browse with this account signed in."
                data={[
                  { label: 'Today', value: daySec, color: 'var(--viz-achievement)' },
                  { label: 'This week', value: weekSec, color: 'var(--viz-neutral)' },
                  { label: 'All time', value: totalSec, color: 'var(--viz-insight)' },
                ]}
              />
              {!analyticsFailed ? (
                <p className="mt-2 text-xs text-[var(--muted)]">
                  All-time browsing {formatStudyHours(totalSec)}
                </p>
              ) : null}
            </ContentIn>
          )}
        </Surface>
      </Reveal>

      <Reveal delayMs={100} className="grid gap-4 lg:grid-cols-2">
        <Surface elevated className="space-y-3 overflow-x-clip p-3.5 sm:p-5">
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
            <ul className="motion-stagger space-y-1">
              {suggestions.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/questions?categoryId=${cat.id}`}
                    className="list-row flex items-center justify-between gap-3 rounded-[var(--radius-sm)] px-1.5 py-2"
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

        <Surface elevated className="space-y-3 overflow-x-clip p-3.5 sm:p-5">
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
                    className="list-row block min-w-0 rounded-[var(--radius-sm)] px-1.5 py-2.5"
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
      </Reveal>

      <Reveal delayMs={110}>
        <Surface elevated className="space-y-3 overflow-x-clip p-3.5 sm:p-5">
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
            <ul className="divide-y divide-[var(--line)] sm:columns-2 sm:gap-6">
              {(stats.data?.recentQuestions ?? []).slice(0, 4).map((item) => (
                <li key={item.bookmarkId} className="break-inside-avoid">
                  <Link
                    href={`/questions/${item.id}`}
                    className="list-row flex min-w-0 items-center justify-between gap-3 rounded-[var(--radius-sm)] px-1.5 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm font-medium">{item.title}</span>
                    <Badge variant="outline" className="shrink-0">
                      {item.difficulty}
                    </Badge>
                  </Link>
                </li>
              ))}
              {(stats.data?.recentDocuments ?? []).slice(0, 3).map((item) => (
                <li key={item.bookmarkId} className="break-inside-avoid">
                  <Link
                    href={`/documents/${item.id}`}
                    className="list-row block truncate rounded-[var(--radius-sm)] px-1.5 py-2.5 text-sm font-medium"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Surface>
      </Reveal>
    </div>
  );
}
