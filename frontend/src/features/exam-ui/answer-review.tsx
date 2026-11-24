'use client';

import { Check, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export type ReviewOption = {
  key: string;
  label: string;
  content: string;
  isCorrect?: boolean;
};

export type ReviewItem = {
  id: string;
  number: number;
  title?: string | null;
  text: string;
  options: ReviewOption[];
  selectedKey: string | null;
  isSkipped: boolean;
  /** API-provided correctness — never computed client-side. */
  isCorrect?: boolean | null;
  explanation?: string | null;
};

type Filter = 'all' | 'correct' | 'wrong' | 'skipped';

type Props = {
  items: ReviewItem[];
  heading?: string;
};

function statusOf(item: ReviewItem): 'correct' | 'wrong' | 'skipped' | 'answered' {
  if (item.isSkipped || !item.selectedKey) return 'skipped';
  if (item.isCorrect === true) return 'correct';
  if (item.isCorrect === false) return 'wrong';
  return 'answered';
}

/** Question-by-question review with All / Correct / Wrong / Skipped filters. */
export function AnswerReview({ items, heading = 'Answer review' }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  const withStatus = useMemo(
    () => items.map((item) => ({ item, status: statusOf(item) })),
    [items],
  );
  const counts = useMemo(() => {
    const c = { all: items.length, correct: 0, wrong: 0, skipped: 0 };
    for (const { status } of withStatus) {
      if (status !== 'answered') c[status] += 1;
    }
    return c;
  }, [items.length, withStatus]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'correct', label: 'Correct' },
    { id: 'wrong', label: 'Wrong' },
    { id: 'skipped', label: 'Skipped' },
  ];

  const visible = withStatus.filter(({ status }) => filter === 'all' || status === filter);

  return (
    <section aria-labelledby="answer-review-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2
          id="answer-review-heading"
          className="font-display text-lg font-bold tracking-tight text-[var(--ink)]"
        >
          {heading}
        </h2>
        <div
          role="group"
          aria-label="Filter questions"
          className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
        >
          {filters.map((f) => {
            const active = filter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(f.id)}
                className={cn(
                  'inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-xs font-semibold whitespace-nowrap transition-colors',
                  active
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]'
                    : 'border-[var(--line)] bg-[var(--bg-elevated)] text-[var(--muted-strong)] hover:border-[var(--line-strong)] hover:text-[var(--ink)]',
                )}
              >
                {f.label}
                <span
                  className={cn(
                    'rounded-full px-1.5 tabular-nums',
                    active ? 'bg-white/20' : 'bg-[var(--bg-muted)]',
                  )}
                >
                  {counts[f.id]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState nested align="center" title="No questions in this filter" />
      ) : (
        <ol className="space-y-3">
          {visible.map(({ item, status }) => (
            <li key={item.id}>
              <ReviewCard item={item} status={status} />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

const STATUS_BADGE = {
  correct: { variant: 'success', label: 'Correct' },
  wrong: { variant: 'danger', label: 'Wrong' },
  skipped: { variant: 'warning', label: 'Skipped' },
  answered: { variant: 'info', label: 'Answered' },
} as const;

function ReviewCard({
  item,
  status,
}: {
  item: ReviewItem;
  status: keyof typeof STATUS_BADGE;
}) {
  const badge = STATUS_BADGE[status];
  return (
    <article
      className={cn(
        'rounded-[var(--radius-lg)] border border-l-4 bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-5',
        '[&_img]:h-auto [&_img]:max-w-full',
        status === 'correct' && 'border-[var(--line)] border-l-[var(--success)]',
        status === 'wrong' && 'border-[var(--line)] border-l-[var(--danger)]',
        status === 'skipped' && 'border-[var(--line)] border-l-[var(--warning)]',
        status === 'answered' && 'border-[var(--line)] border-l-[var(--accent)]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-[var(--muted-strong)]">Question {item.number}</p>
        <Badge variant={badge.variant} className="shrink-0 text-xs">
          {badge.label}
        </Badge>
      </div>
      {item.title && item.title.trim() && item.title.trim() !== item.text.trim() ? (
        <p className="mt-1 text-sm font-semibold break-words text-[var(--muted-strong)]">
          {item.title}
        </p>
      ) : null}
      <h3 className="type-prose-title mt-1.5 break-words whitespace-pre-wrap text-[var(--ink)]">
        {item.text}
      </h3>

      <ul className="mt-3 space-y-2">
        {item.options.map((opt) => {
          const selected = item.selectedKey === opt.key;
          const showCorrect = opt.isCorrect === true;
          const showWrong = selected && opt.isCorrect === false;
          return (
            <li
              key={opt.key}
              className={cn(
                'flex items-start gap-3 rounded-[var(--radius)] border px-3 py-2.5',
                showCorrect && 'border-[var(--success)] bg-[var(--success-soft)]',
                showWrong && 'border-[var(--danger)] bg-[var(--danger-soft)]',
                selected &&
                  !showCorrect &&
                  !showWrong &&
                  'border-[var(--accent)] bg-[var(--accent-soft)]',
                !showCorrect && !showWrong && !selected && 'border-[var(--line)]',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'type-bn-serial mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-sm',
                  showCorrect
                    ? 'bg-[var(--success)] text-white'
                    : showWrong
                      ? 'bg-[var(--danger)] text-white'
                      : selected
                        ? 'bg-[var(--accent)] text-[var(--accent-fg)]'
                        : 'bg-[var(--bg-muted)] text-[var(--muted-strong)]',
                )}
              >
                {showCorrect ? (
                  <Check className="size-4" strokeWidth={3} />
                ) : showWrong ? (
                  <X className="size-4" strokeWidth={3} />
                ) : (
                  opt.label
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="type-mcq-option block break-words whitespace-pre-wrap text-[var(--ink)]">
                  <span className="sr-only">{opt.label}. </span>
                  {opt.content}
                </span>
                {selected || showCorrect ? (
                  <span className="mt-0.5 flex flex-wrap gap-x-2 text-xs font-semibold">
                    {selected ? (
                      <span
                        className={
                          showWrong
                            ? 'text-[var(--danger-fg)]'
                            : showCorrect
                              ? 'text-[var(--success-fg)]'
                              : 'text-[var(--accent)]'
                        }
                      >
                        Your answer
                      </span>
                    ) : null}
                    {showCorrect ? (
                      <span className="text-[var(--success-fg)]">Correct answer</span>
                    ) : null}
                  </span>
                ) : null}
              </span>
            </li>
          );
        })}
      </ul>

      {item.explanation ? (
        <div className="mt-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-soft)] px-3.5 py-3">
          <p className="text-xs font-semibold tracking-wide text-[var(--ink)] uppercase">
            Explanation
          </p>
          <p className="font-reading mt-1 text-sm break-words whitespace-pre-wrap text-[var(--ink-soft)]">
            {item.explanation}
          </p>
        </div>
      ) : null}
    </article>
  );
}
