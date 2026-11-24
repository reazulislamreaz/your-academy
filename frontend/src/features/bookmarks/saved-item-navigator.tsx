'use client';

import { FileText } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/lib/utils';
import type { SavedItem } from './saved-items';

type Props = {
  items: SavedItem[];
  /** -1 when no item is open (list view). */
  currentIndex: number;
  onJump: (index: number) => void;
  className?: string;
};

/** Numbered grid in the style of the exam navigator; PDFs are tinted and iconed. */
export const SavedItemNavigator = memo(function SavedItemNavigator({
  items,
  currentIndex,
  onJump,
  className,
}: Props) {
  return (
    <nav aria-label="Saved item navigator" className={cn('space-y-3', className)}>
      <ul
        className="flex flex-wrap gap-x-3 gap-y-1.5 text-xs text-[var(--muted-strong)]"
        aria-hidden
      >
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[4px] border border-[var(--line-strong)] bg-[var(--bg-elevated)]" />
          Question
        </li>
        <li className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-[4px] border border-[var(--info)] bg-[var(--info-soft)]" />
          PDF
        </li>
      </ul>

      <ol className="grid max-h-[min(22rem,48dvh)] grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5 overflow-y-auto overscroll-contain p-1">
        {items.map((item, i) => {
          const isCurrent = i === currentIndex;
          const isPdf = item.kind === 'document';
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onJump(i)}
                title={item.title}
                aria-label={`Item ${i + 1}, ${isPdf ? 'PDF' : 'question'}: ${item.title}`}
                aria-current={isCurrent ? 'step' : undefined}
                className={cn(
                  'relative flex h-10 w-full cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border text-sm font-semibold tabular-nums',
                  'transition-colors duration-150 motion-reduce:transition-none',
                  isPdf
                    ? 'border-[var(--info)] bg-[var(--info-soft)] text-[var(--info)] hover:text-[var(--ink)]'
                    : 'border-[var(--line-strong)] bg-[var(--bg-elevated)] text-[var(--muted-strong)] hover:border-[var(--accent)] hover:text-[var(--ink)]',
                  isCurrent &&
                    'ring-2 ring-[var(--highlight)] ring-offset-2 ring-offset-[var(--bg-elevated)]',
                )}
              >
                {i + 1}
                {isPdf ? (
                  <FileText aria-hidden className="absolute top-0.5 right-0.5 size-2.5" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
});
