import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Hourglass,
  ListChecks,
  Lock,
  MinusCircle,
  Trophy,
} from 'lucide-react';
import { memo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type ExamCardStatus =
  | { state: 'not-started' }
  | { state: 'in-progress' }
  | { state: 'completed'; percent: number | null; resultHref?: string; attempts?: number };

type Props = {
  href: string;
  title: string;
  /** Small kind label, e.g. "Model test". */
  kindLabel?: string;
  /** Category / subject / year / exam track — only real fields. */
  tags?: string[];
  description?: string | null;
  questionCount: number;
  durationMinutes: number | null;
  totalMarks?: number | null;
  negativeMark?: number | null;
  status?: ExamCardStatus;
  /** DEC-060: paid content for this viewer — `href` should point to Packages / login. */
  locked?: boolean;
};

/** Listing card shared by public + dashboard Quiz / Model Test / practice-set lists. */
export const ExamCard = memo(function ExamCard({
  href,
  title,
  kindLabel,
  tags = [],
  description,
  questionCount,
  durationMinutes,
  totalMarks,
  negativeMark,
  status,
  locked = false,
}: Props) {
  const state = locked ? undefined : status?.state;
  const cta = locked
    ? 'Unlock'
    : state === 'in-progress'
      ? 'Resume'
      : state === 'completed'
        ? 'Retake'
        : 'Start';

  return (
    <article
      className={cn(
        'group relative flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)]',
        'transition-[border-color,box-shadow] duration-150 hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] hover:shadow-[var(--shadow)] motion-reduce:transition-none',
        'focus-within:border-[color-mix(in_srgb,var(--accent)_40%,var(--line))]',
      )}
    >
      <div className="flex min-h-6 flex-wrap items-center gap-1.5">
        {kindLabel ? (
          <span className="text-[0.65rem] font-semibold tracking-[0.12em] text-[var(--highlight)] uppercase">
            {kindLabel}
          </span>
        ) : null}
        {tags.map((tag) => (
          <span
            key={tag}
            className="max-w-full truncate rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--accent)]"
          >
            {tag}
          </span>
        ))}
        {status && state && state !== 'not-started' ? (
          <span className="ml-auto">
            <StatusPill status={status} />
          </span>
        ) : null}
      </div>

      <h3 className="mt-2 font-display text-[0.98rem] leading-snug font-bold break-words text-[var(--ink)]">
        <Link
          href={href}
          className="line-clamp-2 rounded-sm hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {title}
        </Link>
      </h3>
      {description ? (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed break-words text-[var(--muted-strong)]">
          {description}
        </p>
      ) : null}
      {locked ? (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-strong)]">
          <Lock className="size-3.5 shrink-0" aria-hidden />
          Become a paid user to unlock
        </p>
      ) : null}

      <ul className="mt-3 flex flex-wrap gap-x-3.5 gap-y-1.5 text-xs text-[var(--muted-strong)]">
        <li className="inline-flex items-center gap-1">
          <ListChecks className="size-3.5 shrink-0" aria-hidden />
          <span className="tabular-nums">{questionCount}</span> questions
        </li>
        <li className="inline-flex items-center gap-1">
          <Clock3 className="size-3.5 shrink-0" aria-hidden />
          {durationMinutes != null ? (
            <>
              <span className="tabular-nums">{durationMinutes}</span> min
            </>
          ) : (
            'Untimed'
          )}
        </li>
        {totalMarks != null ? (
          <li className="inline-flex items-center gap-1">
            <Trophy className="size-3.5 shrink-0" aria-hidden />
            <span className="tabular-nums">{totalMarks}</span> marks
          </li>
        ) : null}
        {negativeMark != null && negativeMark > 0 ? (
          <li className="inline-flex items-center gap-1 text-[var(--danger-fg)]">
            <MinusCircle className="size-3.5 shrink-0" aria-hidden />
            <span className="tabular-nums">−{negativeMark}</span> per wrong
          </li>
        ) : null}
      </ul>

      <div className="mt-auto flex items-center gap-3 pt-4">
        <Link
          href={href}
          className={cn(
            'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[var(--radius)] px-4 text-sm font-semibold transition-[filter,box-shadow]',
            'focus-visible:outline-2 focus-visible:outline-offset-2',
            state === 'completed'
              ? 'border border-[var(--line-strong)] bg-[var(--bg-elevated)] text-[var(--ink)] hover:bg-[var(--brand-wash)]'
              : 'bg-[var(--highlight)] text-[var(--highlight-fg)] shadow-[var(--shadow-sm)] hover:brightness-95',
          )}
          aria-label={`${cta}: ${title}`}
        >
          {locked ? <Lock className="size-4" aria-hidden /> : null}
          {cta}
          {locked ? null : <ArrowRight className="size-4" aria-hidden />}
        </Link>
        {!locked && status?.state === 'completed' && status.resultHref ? (
          <Link
            href={status.resultHref}
            className="text-sm font-semibold text-[var(--accent)] underline-offset-2 hover:underline"
          >
            View result
          </Link>
        ) : null}
      </div>
    </article>
  );
});

function StatusPill({ status }: { status: ExamCardStatus }) {
  if (status.state === 'in-progress') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--warning-soft)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--warning-fg)]">
        <Hourglass className="size-3" aria-hidden />
        In progress
      </span>
    );
  }
  if (status.state === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--success-soft)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--success-fg)]">
        <CheckCircle2 className="size-3" aria-hidden />
        Completed{status.percent != null ? ` · ${status.percent}%` : ''}
      </span>
    );
  }
  return (
    <span className="rounded-full bg-[var(--bg-muted)] px-2 py-0.5 text-[0.7rem] font-semibold text-[var(--muted-strong)]">
      Not started
    </span>
  );
}

/** Mirrors `ExamCard` for list loading states. */
export function ExamCardGridSkeleton({
  count = 6,
  className,
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">Loading…</span>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li
            key={i}
            className="flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4"
          >
            <Skeleton className="h-4 w-24 rounded-full" />
            <Skeleton className="h-5 w-4/5 rounded-md" />
            <div className="flex gap-3">
              <Skeleton className="h-3.5 w-20 rounded-md" />
              <Skeleton className="h-3.5 w-14 rounded-md" />
            </div>
            <Skeleton className="mt-2 h-11 w-24 rounded-[var(--radius)]" />
          </li>
        ))}
      </ul>
    </div>
  );
}
