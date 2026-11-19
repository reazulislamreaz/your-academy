'use client';

import type { PublicWrittenQuestionCard } from '@/lib/api/written-questions';
import { cn } from '@/lib/utils';

type Props = {
  question: PublicWrittenQuestionCard;
  className?: string;
};

/** Written bank card — question stem + marks only (no model-answer UI). */
export function PublicWrittenCard({ question, className }: Props) {
  return (
    <article
      id={`wq-${question.id}`}
      className={cn(
        'ya-panel-shine relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)] sm:p-6',
        className,
      )}
    >
      <div className="relative z-[1] flex flex-wrap items-start justify-between gap-3">
        <h2 className="type-prose-title min-w-0 flex-1 text-[var(--ink)]">
          {question.sourceSerial ? (
            <span className="mr-2 font-bold text-[var(--highlight)] tabular-nums">
              {question.sourceSerial}.
            </span>
          ) : null}
          <span className="whitespace-pre-wrap break-words">{question.content}</span>
        </h2>
        {question.marks != null ? (
          <span className="shrink-0 rounded-full border border-[var(--line)] bg-[var(--bg-muted)] px-3 py-1 text-xs font-semibold tabular-nums text-[var(--ink-soft)]">
            {question.marks} marks
          </span>
        ) : null}
      </div>
    </article>
  );
}
