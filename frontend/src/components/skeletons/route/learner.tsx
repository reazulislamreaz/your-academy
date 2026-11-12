import { Surface } from '@/components/ui/surface';
import { Skeleton } from '@/components/ui/skeleton';
import {
  MetricTileSkeletonExact,
  PageHeaderSkeleton,
  PracticeSetGridSkeleton,
  SkBadge,
  SkButton,
  SkCircle,
  SkLine,
  SkPill,
  SkStatus,
  SkTitle,
} from '@/components/skeletons/primitives';
import { cn } from '@/lib/utils';

/** `/home` — welcome strip, 8 metric tiles, continue/charts, results/topics, news/bookmarks. */
export function HomePageSkeleton() {
  return (
    <SkStatus label="Loading dashboard…" className="flex w-full flex-col gap-5 pb-10 sm:gap-6">
      <Surface className="overflow-hidden border-l-[3px] border-l-[var(--highlight)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <SkLine className="h-3 w-24" />
            <SkTitle className="w-56 sm:w-72" />
            <SkLine className="h-4 w-full max-w-xl" />
            <Skeleton className="mt-1 h-8 w-40 rounded-full" />
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <SkPill className="h-11 w-full sm:w-40" />
            <SkPill className="h-11 w-full sm:w-28" />
          </div>
        </div>
        <SkLine className="mt-3 h-3 w-full max-w-lg" />
      </Surface>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricTileSkeletonExact key={`kpi-a-${i}`} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricTileSkeletonExact key={`kpi-b-${i}`} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Surface className="space-y-4 p-4 sm:p-5 lg:col-span-3">
          <div className="flex items-center justify-between gap-2">
            <SkLine className="h-4 w-48" />
            <SkLine className="h-3 w-24" />
          </div>
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)] p-4 space-y-2">
            <SkLine className="h-3 w-20" />
            <Skeleton className="h-6 w-3/4 max-w-md" />
            <SkLine className="h-3.5 w-32" />
            <SkPill className="mt-2 h-9 w-24" />
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Skeleton className="h-16 w-full rounded-[12px]" />
            <Skeleton className="h-16 w-full rounded-[12px]" />
          </div>
        </Surface>
        <Surface className="flex flex-col items-center gap-4 p-4 sm:p-5 lg:col-span-2">
          <SkLine className="h-4 w-28 self-start" />
          <Skeleton className="size-40 rounded-full" />
          <div className="flex gap-4">
            <SkLine className="h-3 w-16" />
            <SkLine className="h-3 w-16" />
          </div>
        </Surface>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Surface className="space-y-3 p-4 sm:p-5">
          <SkLine className="h-4 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between gap-2">
                <SkLine className="h-3.5 w-28" />
                <SkLine className="h-3 w-8" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </Surface>
        <Surface className="space-y-3 p-4 sm:p-5">
          <SkLine className="h-4 w-24" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="flex justify-between gap-3">
                <SkLine className="h-3 w-16" />
                <SkLine className="h-3 w-10" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
          ))}
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="space-y-3 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2">
            <SkLine className="h-4 w-32" />
            <SkBadge />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-8 shrink-0 rounded-[8px]" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkLine className="h-3.5 w-3/4" />
                <SkLine className="h-3 w-20" />
              </div>
            </div>
          ))}
        </Surface>
        <Surface className="space-y-3 p-4 sm:p-5">
          <SkLine className="h-4 w-36" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 flex-1 space-y-1.5">
                <SkLine className="h-3.5 w-40" />
                <SkLine className="h-3 w-24" />
              </div>
              <SkBadge />
            </div>
          ))}
        </Surface>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Surface className="space-y-3 p-4 sm:p-5">
          <SkLine className="h-4 w-40" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-1.5 border-b border-[var(--line)] py-2.5 last:border-0">
              <SkLine className="h-3.5 w-full" />
              <SkLine className="h-3 w-[80%]" />
            </div>
          ))}
        </Surface>
        <Surface className="space-y-3 p-4 sm:p-5">
          <SkLine className="h-4 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="size-8 shrink-0 rounded-[8px]" />
              <SkLine className="h-3.5 w-2/3" />
            </div>
          ))}
        </Surface>
      </div>
    </SkStatus>
  );
}

/** Home section: answer mix donut. */
export function HomeAnswerMixSkeleton() {
  return (
    <div className="flex flex-col items-center gap-4 py-2">
      <Skeleton className="size-40 rounded-full" />
      <div className="flex gap-4">
        <SkLine className="h-3 w-16" />
        <SkLine className="h-3 w-16" />
      </div>
    </div>
  );
}

/** Home section: subject progress bars. */
export function HomeSubjectProgressSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i} className="space-y-1.5">
          <div className="flex justify-between gap-2">
            <SkLine className="h-3.5 w-28" />
            <SkLine className="h-3 w-8" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** Home section: study time bars. */
export function HomeStudyTimeSkeleton() {
  return (
    <ul className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="space-y-1.5">
          <div className="flex justify-between gap-3">
            <SkLine className="h-3 w-16" />
            <SkLine className="h-3 w-10" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** Home section: recent results / topics / news / bookmarks lists. */
export function HomeActivityListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-[var(--line)]">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 px-1.5 py-2.5">
          <Skeleton className="size-8 shrink-0 rounded-[8px]" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <SkLine className="h-3.5 w-3/4" />
            <SkLine className="h-3 w-24" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** `/questions` — header, filter panel, chips, list rows. */
export function QuestionsPageSkeleton() {
  return (
    <SkStatus label="Loading questions…" className="space-y-8">
      <PageHeaderSkeleton />
      <Surface className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <SkLine className="h-3 w-16" />
            <Skeleton className="h-11 w-full rounded-[var(--radius)]" />
          </div>
        ))}
      </Surface>
      <div className="flex flex-wrap gap-2">
        <SkBadge className="h-8 w-28" />
        <SkBadge className="h-8 w-24" />
        <SkLine className="h-8 w-16" />
      </div>
      <SkLine className="h-4 w-48" />
      <QuestionsListBodySkeleton />
    </SkStatus>
  );
}

export function QuestionsListBodySkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-4 py-4">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <SkLine className="h-3 w-28" />
              <SkBadge className="w-14" />
            </div>
            <Skeleton className="h-5 w-full max-w-xl" />
          </div>
          <Skeleton className="mt-1 size-4 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/** `/questions/[id]` — meta, stem, 4 options, sticky nav. */
export function QuestionDetailPageSkeleton() {
  return (
    <SkStatus label="Loading question…" className="mx-auto max-w-3xl space-y-6 pb-28">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <SkBadge />
          <SkBadge className="w-24" />
          <SkLine className="h-4 w-32" />
        </div>
        <SkPill className="h-9 w-24" />
      </div>
      <header className="space-y-4 border-b border-[var(--line)] pb-6">
        <Skeleton className="h-8 w-full max-w-2xl sm:h-10" />
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-[83%] max-w-xl" />
      </header>
      <div className="grid gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--line)] px-4 py-3.5"
          >
            <SkCircle className="mt-0.5 size-5" />
            <Skeleton className="h-4 w-full max-w-md" />
          </div>
        ))}
      </div>
      <Surface className="space-y-2 p-5 sm:p-6">
        <SkLine className="h-4 w-40" />
        <SkLine className="h-3.5 w-full max-w-lg" />
      </Surface>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--line)] bg-[var(--bg-elevated)]/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:left-[var(--app-sidebar-width)]">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <SkButton className="h-11 w-24" />
          <SkButton className="h-11 flex-1 sm:max-w-xs sm:flex-none sm:w-40" />
          <SkButton className="h-11 w-24" />
        </div>
      </div>
    </SkStatus>
  );
}

/** `/subjects` — header + subject cards grid. */
export function SubjectsPageSkeleton({ omitHeader }: { omitHeader?: boolean } = {}) {
  const grid = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Surface key={i} className="space-y-2 p-4">
          <Skeleton className="h-5 w-2/3" />
          <SkLine className="h-3.5 w-full" />
          <SkLine className="h-3.5 w-[80%]" />
          <SkLine className="mt-2 h-3 w-24" />
        </Surface>
      ))}
    </div>
  );
  if (omitHeader) {
    return <SkStatus label="Loading subjects…">{grid}</SkStatus>;
  }
  return (
    <SkStatus label="Loading subjects…" className="space-y-8">
      <PageHeaderSkeleton />
      {grid}
    </SkStatus>
  );
}

/** `/subjects/[slug]` — header, topic list, practice sets. */
export function SubjectDetailPageSkeleton() {
  return (
    <SkStatus label="Loading subject…" className="space-y-8">
      <PageHeaderSkeleton />
      <Surface className="space-y-3 p-4 sm:p-5">
        <SkLine className="h-4 w-28" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-[10px] border border-[var(--line)] px-3 py-3"
          >
            <SkLine className="h-4 w-40" />
            <SkBadge />
          </div>
        ))}
      </Surface>
      <div className="space-y-3">
        <SkLine className="h-5 w-40" />
        <PracticeSetGridSkeleton count={2} />
      </div>
    </SkStatus>
  );
}

/** Quizzes / model-tests / daily-quiz / previous-year browse. */
export function PracticeBrowsePageSkeleton({ className }: { className?: string }) {
  return (
    <SkStatus label="Loading practice sets…" className={cn('space-y-8', className)}>
      <PageHeaderSkeleton />
      <PracticeSetGridSkeleton count={4} />
    </SkStatus>
  );
}

/** `/exams` — exam track cards. */
export function ExamsPageSkeleton() {
  return (
    <SkStatus label="Loading exam tracks…" className="space-y-8">
      <PageHeaderSkeleton />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Surface key={i} className="p-4">
            <Skeleton className="h-5 w-40" />
            <div className="mt-3 flex flex-wrap gap-3">
              <SkLine className="h-4 w-24" />
              <SkLine className="h-4 w-20" />
              <SkLine className="h-4 w-24" />
            </div>
          </Surface>
        ))}
      </div>
    </SkStatus>
  );
}

/** `/practice/[slug]` — player shell. */
export function PracticePlayerPageSkeleton() {
  return (
    <SkStatus label="Loading practice set…" className="space-y-6">
      <PageHeaderSkeleton withActions />
      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SkLine className="h-4 w-32" />
          <Skeleton className="h-2 w-40 rounded-full" />
        </div>
        <Skeleton className="h-6 w-full max-w-xl" />
        <div className="grid gap-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-[var(--radius)] border border-[var(--line)] px-4 py-3.5"
            >
              <SkCircle className="mt-0.5 size-5" />
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <SkButton className="w-28" />
          <SkButton className="w-32" />
        </div>
      </Surface>
    </SkStatus>
  );
}

/** `/results` — attempt cards. */
export function ResultsPageSkeleton({ omitHeader }: { omitHeader?: boolean } = {}) {
  return (
    <SkStatus label="Loading results…" className={omitHeader ? 'space-y-3' : 'space-y-8'}>
      {omitHeader ? null : <PageHeaderSkeleton />}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Surface key={i} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap gap-2">
                <SkBadge />
                <SkBadge className="w-20" />
              </div>
              <Skeleton className="h-5 w-56 max-w-full" />
              <SkLine className="h-3 w-40" />
            </div>
            <div className="space-y-1.5 text-right">
              <Skeleton className="ml-auto h-7 w-16" />
              <SkLine className="ml-auto h-3 w-20" />
            </div>
          </Surface>
        ))}
      </div>
    </SkStatus>
  );
}

/** `/results/[id]` — score tiles + review list. */
export function ResultDetailPageSkeleton() {
  return (
    <SkStatus label="Loading result…" className="space-y-6">
      <PageHeaderSkeleton />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Surface key={i} className="space-y-2 p-4 text-center">
            <SkLine className="mx-auto h-3 w-14" />
            <Skeleton className="mx-auto h-8 w-12" />
          </Surface>
        ))}
      </div>
      <Surface className="space-y-3 p-4 sm:p-5">
        <SkLine className="h-4 w-36" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 border-t border-[var(--line)] py-3">
            <SkCircle className="size-6" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <SkLine className="h-3.5 w-full" />
              <SkLine className="h-3 w-2/3" />
            </div>
            <SkBadge />
          </div>
        ))}
      </Surface>
    </SkStatus>
  );
}

/** `/bookmarks` — tabs + saved rows. */
export function BookmarksPageSkeleton({ omitChrome }: { omitChrome?: boolean } = {}) {
  const rows = (
    <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-start justify-between gap-3 py-4">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4 max-w-md" />
            <SkLine className="h-3.5 w-32" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SkBadge />
            <SkPill className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );

  if (omitChrome) {
    return (
      <SkStatus label="Loading bookmarks…">{rows}</SkStatus>
    );
  }

  return (
    <SkStatus label="Loading bookmarks…" className="space-y-8">
      <PageHeaderSkeleton />
      <div className="flex gap-1 border-b border-[var(--line)]">
        <Skeleton className="mx-3 mb-0 h-9 w-24 rounded-none" />
        <Skeleton className="mx-3 mb-0 h-9 w-16 rounded-none" />
      </div>
      {rows}
    </SkStatus>
  );
}

/** `/documents` — PDF list. */
export function DocumentsPageSkeleton({ omitHeader }: { omitHeader?: boolean } = {}) {
  return (
    <SkStatus label="Loading documents…" className={omitHeader ? undefined : 'space-y-8'}>
      {omitHeader ? null : <PageHeaderSkeleton />}
      <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start justify-between gap-3 py-4">
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3 max-w-sm" />
              <SkLine className="h-3.5 w-full max-w-md" />
            </div>
            <SkBadge className="w-20" />
          </div>
        ))}
      </div>
    </SkStatus>
  );
}

/** `/documents/[id]` */
export function DocumentDetailPageSkeleton() {
  return (
    <SkStatus label="Loading document…" className="mx-auto w-full max-w-3xl space-y-4">
      <SkLine className="h-4 w-24" />
      <Surface className="space-y-4 p-5 sm:p-6">
        <Skeleton className="h-7 w-3/4 max-w-lg" />
        <SkLine className="h-4 w-full" />
        <SkLine className="h-4 w-[83%]" />
        <div className="flex flex-wrap gap-2 pt-2">
          <SkBadge />
          <SkPill className="w-28" />
        </div>
      </Surface>
    </SkStatus>
  );
}

/** `/news` */
export function NewsPageSkeleton({ omitHeader }: { omitHeader?: boolean } = {}) {
  return (
    <SkStatus label="Loading news…" className={omitHeader ? undefined : 'space-y-8'}>
      {omitHeader ? null : <PageHeaderSkeleton />}
      <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="space-y-2 py-4">
            <Skeleton className="h-5 w-3/4 max-w-xl" />
            <SkLine className="h-3.5 w-full max-w-2xl" />
            <SkLine className="h-3 w-28" />
          </li>
        ))}
      </ul>
    </SkStatus>
  );
}

/** `/news/[slug]` */
export function NewsDetailPageSkeleton() {
  return (
    <SkStatus label="Loading article…" className="mx-auto max-w-3xl space-y-6">
      <SkLine className="h-4 w-20" />
      <header className="space-y-3 border-b border-[var(--line)] pb-6">
        <Skeleton className="h-9 w-full max-w-2xl" />
        <SkLine className="h-3.5 w-32" />
      </header>
      <div className="space-y-3">
        <SkLine className="h-4 w-full" />
        <SkLine className="h-4 w-full" />
        <SkLine className="h-4 w-[83%]" />
        <SkLine className="h-4 w-full" />
        <SkLine className="h-4 w-2/3" />
      </div>
      <Surface className="space-y-3 p-4">
        <SkLine className="h-4 w-36" />
        <SkLine className="h-3.5 w-full" />
        <SkLine className="h-3.5 w-[80%]" />
      </Surface>
    </SkStatus>
  );
}

/** `/profile` */
export function ProfilePageSkeleton() {
  return (
    <SkStatus label="Loading profile…" className="space-y-6 pb-10 sm:space-y-8">
      <PageHeaderSkeleton withActions />
      <Surface className="space-y-4 border-l-[3px] border-l-[var(--highlight)] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <SkCircle className="size-14" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-44" />
              <SkLine className="h-3.5 w-52" />
            </div>
          </div>
          <Skeleton className="h-8 w-36 rounded-full" />
        </div>
        <SkLine className="h-4 w-full max-w-lg" />
      </Surface>
      <section className="space-y-3">
        <Skeleton className="h-5 w-36" />
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTileSkeletonExact />
          <MetricTileSkeletonExact />
          <MetricTileSkeletonExact />
        </div>
      </section>
      {Array.from({ length: 3 }).map((_, i) => (
        <Surface key={i} className="space-y-4 p-4 sm:p-5">
          <Skeleton className="h-5 w-40" />
          <SkLine className="h-3.5 w-64 max-w-full" />
          {Array.from({ length: 2 }).map((__, j) => (
            <div key={j} className="space-y-2">
              <SkLine className="h-3.5 w-24" />
              <Skeleton className="h-11 w-full rounded-[var(--radius)]" />
            </div>
          ))}
          <SkButton className="w-32" />
        </Surface>
      ))}
    </SkStatus>
  );
}

/** `/onboarding` */
export function OnboardingPageSkeleton() {
  return (
    <SkStatus label="Loading onboarding…" className="mx-auto max-w-2xl space-y-8">
      <PageHeaderSkeleton />
      <div className="flex gap-2">
        <Skeleton className="h-1.5 flex-1 rounded-full" />
        <Skeleton className="h-1.5 flex-1 rounded-full" />
      </div>
      <Surface className="space-y-4 p-6">
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-[var(--radius)]" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 pt-2">
          <SkPill className="w-28" />
          <SkPill className="w-24" />
        </div>
      </Surface>
    </SkStatus>
  );
}
