'use client';

import Link from 'next/link';
import { Bookmark, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { SaveToCollectionDialog } from '@/features/bookmarks/save-to-collection-dialog';
import { useMe, isUnauthorized } from '@/features/auth/use-auth';
import type { PublicQuestionCard } from '@/lib/api/public-questions';
import { cn } from '@/lib/utils';

const BN_OPTION: Record<string, string> = {
  A: 'ক',
  B: 'খ',
  C: 'গ',
  D: 'ঘ',
};

type Props = {
  question: PublicQuestionCard;
  className?: string;
  answerVisible?: boolean;
  onToggleAnswer?: () => void;
  /** When true, show per-question Show/Hide control (global hide mode). */
  allowIndividualToggle?: boolean;
};

export function PublicMcqCard({
  question,
  className,
  answerVisible = true,
  onToggleAnswer,
  allowIndividualToggle = false,
}: Props) {
  const me = useMe();
  const loggedIn = Boolean(me.data) && !isUnauthorized(me.error);
  const [saveOpen, setSaveOpen] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(`/preli-question-bank#q-${question.id}`)}`;

  return (
    <article
      id={`q-${question.id}`}
      className={cn(
        'ya-panel-shine relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow)] sm:p-6',
        className,
      )}
    >
      <div className="relative z-[1] space-y-3">
        <h2 className="font-reading text-lg leading-snug font-bold tracking-tight text-[var(--ink)] sm:text-xl">
          <span className="whitespace-pre-wrap break-words">{question.content}</span>
        </h2>

        {question.sourceLabel ? (
          <p>
            <span className="inline-flex max-w-full rounded-md bg-[var(--brand-wash-strong)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-soft)]">
              [{question.sourceLabel}]
            </span>
          </p>
        ) : null}
      </div>

      <ul className="relative z-[1] mt-5 grid gap-2.5 sm:grid-cols-2">
        {question.options.map((opt) => {
          const isCorrect = opt.label === question.correctAnswerLabel;
          const highlight = answerVisible && isCorrect;
          return (
            <li
              key={opt.id}
              className={cn(
                'rounded-[var(--radius)] border px-3.5 py-3 text-sm leading-relaxed transition-colors duration-200',
                highlight
                  ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--ink)]'
                  : 'border-[var(--line)] bg-[var(--bg-desk)] text-[var(--ink-soft)]',
              )}
            >
              <span className="font-semibold text-[var(--ink)]">
                ({BN_OPTION[opt.label] ?? opt.label})
              </span>{' '}
              <span className="whitespace-pre-wrap break-words">{opt.content}</span>
            </li>
          );
        })}
      </ul>

      <div className="relative z-[1] mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
        {loggedIn ? (
          <button
            type="button"
            onClick={() => setSaveOpen(true)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
          >
            <Bookmark className="size-4" aria-hidden strokeWidth={1.75} />
            Save
          </button>
        ) : (
          <Link
            href={loginHref}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--muted-strong)] transition-colors hover:text-[var(--highlight)]"
          >
            <Bookmark className="size-4" aria-hidden strokeWidth={1.75} />
            Save
          </Link>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {allowIndividualToggle && onToggleAnswer ? (
            <button
              type="button"
              onClick={onToggleAnswer}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm font-medium text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--bg-muted)]"
            >
              {answerVisible ? (
                <>
                  <EyeOff className="size-3.5" aria-hidden />
                  Hide Answer
                </>
              ) : (
                <>
                  <Eye className="size-3.5" aria-hidden />
                  Show Answer
                </>
              )}
            </button>
          ) : null}

          <span
            className={cn(
              'inline-flex items-center rounded-full px-3.5 py-1.5 text-sm font-semibold transition-all duration-200',
              answerVisible
                ? 'bg-[var(--success-soft)] text-[var(--success)] opacity-100'
                : 'pointer-events-none max-h-0 overflow-hidden bg-transparent px-0 py-0 opacity-0',
            )}
            aria-hidden={!answerVisible}
          >
            {answerVisible
              ? `উত্তর: ${question.correctAnswerBn || question.correctAnswerLabel}`
              : null}
          </span>
        </div>
      </div>

      {loggedIn ? (
        <SaveToCollectionDialog
          open={saveOpen}
          questionId={question.id}
          questionTitle={question.title}
          onClose={() => setSaveOpen(false)}
        />
      ) : null}
    </article>
  );
}
