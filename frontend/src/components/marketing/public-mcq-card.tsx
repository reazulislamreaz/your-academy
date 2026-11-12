'use client';

import Link from 'next/link';
import { Bookmark } from 'lucide-react';
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
};

export function PublicMcqCard({ question, className }: Props) {
  const me = useMe();
  const loggedIn = Boolean(me.data) && !isUnauthorized(me.error);
  const [saveOpen, setSaveOpen] = useState(false);
  const loginHref = `/login?next=${encodeURIComponent(`/preli-question-bank#q-${question.id}`)}`;

  return (
    <article
      id={`q-${question.id}`}
      className={cn(
        'overflow-hidden rounded-[1.25rem] border border-[var(--line)] bg-white p-5 shadow-[var(--shadow)] sm:p-6',
        className,
      )}
    >
      <div className="space-y-3">
        <h2 className="font-reading text-lg leading-snug font-bold tracking-tight text-[var(--ink)] sm:text-xl">
          <span className="whitespace-pre-wrap break-words">{question.content}</span>
          <span className="ml-1.5 inline-block align-middle text-base text-[var(--highlight)]" aria-hidden>
            ❤
          </span>
        </h2>

        {question.sourceLabel ? (
          <p>
            <span className="inline-flex max-w-full rounded-md bg-[#dbe4f0] px-2.5 py-1 text-xs font-semibold text-[#334155]">
              [{question.sourceLabel}]
            </span>
          </p>
        ) : null}
      </div>

      <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
        {question.options.map((opt) => (
          <li
            key={opt.id}
            className="rounded-[12px] border border-[var(--line)] bg-[#f7f8fa] px-3.5 py-3 text-sm leading-relaxed text-[var(--ink-soft)]"
          >
            <span className="font-semibold text-[var(--ink)]">
              ({BN_OPTION[opt.label] ?? opt.label})
            </span>{' '}
            <span className="whitespace-pre-wrap break-words">{opt.content}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-4">
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

        <span className="inline-flex items-center rounded-full bg-[var(--success-soft)] px-3.5 py-1.5 text-sm font-semibold text-[var(--success)]">
          উত্তর: {question.correctAnswerBn || question.correctAnswerLabel}
        </span>
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
