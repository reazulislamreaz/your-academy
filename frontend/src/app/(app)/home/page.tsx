'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BookMarked, Clock3, Sparkles } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { TrialCountdown } from '@/features/auth/trial-countdown';
import { isUnauthorized, useMe } from '@/features/auth/use-auth';
import { apiFetch } from '@/lib/api/client';
import type { CategoryNode, UserStats } from '@/lib/api/types';
import { formatStudyMinutes } from '@/lib/study-prefs';

export default function StudyHomePage() {
  const me = useMe();

  const stats = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiFetch<UserStats>('/users/me/stats'),
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
        <Skeleton className="h-32 w-full" />
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

  const last = me.data.study?.lastQuestion ?? null;
  const preferredIds = me.data.study?.preferredCategoryIds ?? [];
  const preferred =
    categories.data?.filter((c) => preferredIds.includes(c.id)).slice(0, 3) ?? [];
  const suggestions =
    preferred.length > 0 ? preferred : (categories.data?.slice(0, 3) ?? []);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Study"
        title={`Welcome back, ${me.data.name.split(' ')[0]}`}
        description="Continue practice, check your trial, and jump into topics you care about."
        actions={
          <Link href="/questions">
            <Button size="sm">
              Question bank
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Surface className="motion-rise space-y-4 p-6">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            <Sparkles className="h-3.5 w-3.5 text-[var(--highlight)]" aria-hidden />
            Continue
          </div>
          {last ? (
            <>
              <h2 className="font-display text-2xl font-semibold tracking-tight">{last.title}</h2>
              {last.categoryName ? (
                <p className="text-sm text-[var(--muted)]">{last.categoryName}</p>
              ) : null}
              <Link href={`/questions/${last.id}${last.filterQs ? `?${last.filterQs}` : ''}`}>
                <Button>Resume question</Button>
              </Link>
            </>
          ) : (
            <>
              <h2 className="font-display text-2xl font-semibold tracking-tight">
                Start a practice session
              </h2>
              <p className="text-sm leading-relaxed text-[var(--muted)]">
                Open a question and check an answer — we will remember it here across devices.
              </p>
              <Link href="/questions">
                <Button>Browse questions</Button>
              </Link>
            </>
          )}
        </Surface>

        <Surface className="motion-rise space-y-4 border-l-[3px] border-l-[var(--highlight)] p-6">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Access
          </h2>
          <TrialCountdown
            trialEndsAt={me.data.access.trialEndsAt}
            isTrialActive={me.data.access.isTrialActive}
          />
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            {me.data.access.isTrialActive
              ? 'Answers and explanations are unlocked for the rest of your trial.'
              : 'You can still browse questions, options, PDFs, and news. Correct answers stay premium.'}
          </p>
          <Link
            href="/profile"
            className="text-sm font-semibold underline-offset-2 hover:underline"
          >
            Study report
          </Link>
        </Surface>
      </div>

      <div className="grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            <BookMarked className="h-3.5 w-3.5" aria-hidden />
            Saved questions
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">
            {stats.data?.questionBookmarks ?? 0}
          </p>
        </div>
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            <BookMarked className="h-3.5 w-3.5" aria-hidden />
            Saved PDFs
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">
            {stats.data?.documentBookmarks ?? 0}
          </p>
        </div>
        <div className="bg-[var(--bg-elevated)] p-5">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Study time
          </p>
          <p className="mt-2 font-display text-3xl font-bold tabular-nums">
            {formatStudyMinutes(stats.data?.browsingSeconds ?? 0)}
          </p>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight">Suggested topics</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {preferred.length > 0
                ? 'Based on topics saved to your account during onboarding.'
                : 'Popular categories from the live library.'}
            </p>
          </div>
          <Link
            href="/onboarding"
            className="text-sm font-semibold underline-offset-2 hover:underline"
          >
            Update interests
          </Link>
        </div>
        {categories.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : suggestions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Categories will appear after seeding.</p>
        ) : (
          <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
            {suggestions.map((cat) => (
              <li key={cat.id}>
                <Link
                  href={`/questions?categoryId=${cat.id}`}
                  className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-[var(--brand-wash)]"
                >
                  <div>
                    <p className="font-display text-lg font-semibold tracking-tight">{cat.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {cat.children.length} subtopics
                    </p>
                  </div>
                  <Badge variant="outline">Practice</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {stats.data && stats.data.recentQuestions.length > 0 ? (
        <Surface className="space-y-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Recent saves</h2>
            <Link
              href="/bookmarks"
              className="text-sm font-semibold underline-offset-2 hover:underline"
            >
              All bookmarks
            </Link>
          </div>
          <ul className="space-y-2">
            {stats.data.recentQuestions.slice(0, 5).map((item) => (
              <li key={item.bookmarkId}>
                <Link
                  href={`/questions/${item.id}`}
                  className="text-sm font-semibold underline-offset-2 hover:underline"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </div>
  );
}
