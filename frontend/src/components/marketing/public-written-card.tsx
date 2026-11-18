'use client';

import { Eye, EyeOff } from 'lucide-react';
import type { PublicWrittenQuestionCard } from '@/lib/api/written-questions';
import { cn } from '@/lib/utils';

type Props = {
  question: PublicWrittenQuestionCard;
  className?: string;
  answerVisible?: boolean;
  onToggleAnswer?: () => void;
  allowIndividualToggle?: boolean;
};

export function PublicWrittenCard({
  question,
  className,
  answerVisible = true,
  onToggleAnswer,
  allowIndividualToggle = false,
}: Props) {
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

      <div className="relative z-[1] mt-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
            Model answer
          </p>
          {allowIndividualToggle && onToggleAnswer ? (
            <button
              type="button"
              onClick={onToggleAnswer}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-muted)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-soft)] transition-colors hover:bg-[var(--bg-desk)] hover:text-[var(--ink)]"
            >
              {answerVisible ? (
                <>
                  <EyeOff className="size-3.5" aria-hidden />
                  Hide answer
                </>
              ) : (
                <>
                  <Eye className="size-3.5" aria-hidden />
                  Show answer
                </>
              )}
            </button>
          ) : null}
        </div>

        {answerVisible ? (
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)] px-4 py-3.5 text-sm leading-relaxed whitespace-pre-wrap break-words text-[var(--ink-soft)]">
            {question.modelAnswer?.trim()
              ? question.modelAnswer
              : 'No model answer published for this question.'}
          </div>
        ) : (
          <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] bg-[var(--bg-muted)] px-4 py-6 text-center text-sm text-[var(--muted-strong)]">
            Answer hidden
          </div>
        )}
      </div>
    </article>
  );
}
