'use client';

import { Check, FileText, Folder, Maximize2, Trash2 } from 'lucide-react';
import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import type { BookmarkCollectionSummary } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import type { SavedItem } from './saved-items';

type Props = {
  item: SavedItem;
  number: number;
  folders: BookmarkCollectionSummary[];
  busy: boolean;
  onOpen: (key: string) => void;
  onMove: (item: SavedItem, collectionId: string | null) => void;
  onRemove: (item: SavedItem) => void;
};

/**
 * One row of the Saved "View All" sheet. MCQs show the full stem and options
 * (plus the key and explanation only when the API sent them — DEC-051); PDFs
 * show a compact card that opens the inline reader.
 */
export const SavedSheetCard = memo(function SavedSheetCard({
  item,
  number,
  folders,
  busy,
  onOpen,
  onMove,
  onRemove,
}: Props) {
  const q = item.question;
  const isPdf = item.kind === 'document';
  const headingId = `saved-${item.key}-heading`;

  return (
    <section
      id={`saved-${item.key}`}
      aria-labelledby={headingId}
      className="scroll-mt-40 rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] sm:p-6 [&_img]:h-auto [&_img]:max-w-full"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
          {isPdf ? 'PDF' : 'Question'} <span className="tabular-nums">{number}</span>
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {q ? <Badge variant="info">{q.difficulty}</Badge> : null}
          {item.folder ? (
            <Badge variant="bookmark" className="gap-1">
              <Folder className="size-3" aria-hidden />
              {item.folder.name}
            </Badge>
          ) : null}
        </div>
      </div>

      {isPdf ? (
        <button
          type="button"
          onClick={() => onOpen(item.key)}
          className="group mt-3 flex w-full cursor-pointer items-start gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)]/50 p-3 text-left transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--brand-wash)]"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--info-soft)] text-[var(--info)]">
            <FileText className="size-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span
              id={headingId}
              className="block font-display text-base font-semibold break-words text-[var(--ink)] group-hover:text-[var(--highlight)]"
            >
              {item.title}
            </span>
            <span className="mt-0.5 block text-xs text-[var(--muted-strong)]">Tap to read</span>
          </span>
        </button>
      ) : q ? (
        <>
          <p className="mt-2 text-xs text-[var(--muted-strong)]">{item.subtitle}</p>
          {q.sectionTitle ? (
            <p className="mt-3 text-sm font-semibold break-words whitespace-pre-wrap text-[var(--muted-strong)]">
              {q.sectionTitle}
            </p>
          ) : null}
          <h2
            id={headingId}
            className="type-prose-title mt-3 break-words whitespace-pre-wrap text-[var(--ink)]"
          >
            {q.title}
          </h2>
          {q.content && q.content.trim() !== q.title.trim() ? (
            <p className="type-prose mt-2 break-words whitespace-pre-wrap text-[var(--ink-soft)]">
              {q.content}
            </p>
          ) : null}

          <ol className="mt-4 grid gap-2" aria-label={`Options for question ${number}`}>
            {q.options.map((o) => {
              const correct = o.isCorrect === true;
              return (
                <li
                  key={o.id}
                  className={cn(
                    'flex items-start gap-3 rounded-[var(--radius)] border px-3 py-2.5 sm:px-4',
                    correct
                      ? 'border-[var(--learn-correct)] bg-[var(--learn-correct-soft)]'
                      : 'border-[var(--line)] bg-[var(--bg-elevated)]',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'type-bn-serial flex size-7 shrink-0 items-center justify-center rounded-full text-sm',
                      correct
                        ? 'bg-[var(--learn-correct)] text-white'
                        : 'bg-[var(--bg-muted)] text-[var(--muted-strong)]',
                    )}
                  >
                    {o.label}
                  </span>
                  <span className="type-mcq-option min-w-0 flex-1 pt-0.5 break-words whitespace-pre-wrap text-[var(--ink)]">
                    <span className="sr-only">{o.label}. </span>
                    {o.content}
                    {correct ? <span className="sr-only"> (correct answer)</span> : null}
                  </span>
                  {correct ? (
                    <Check className="mt-1 size-4 shrink-0 text-[var(--learn-correct)]" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ol>

          {q.explanation ? (
            <div className="mt-4 rounded-[var(--radius)] border border-[var(--line)] border-l-[3px] border-l-[var(--info)] bg-[var(--bg-muted)] p-3.5 sm:p-4">
              <h3 className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Explanation
              </h3>
              <p className="type-prose mt-1.5 break-words whitespace-pre-wrap text-[var(--ink-soft)]">
                {q.explanation}
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-3">
        <label className="sr-only" htmlFor={`move-${item.key}`}>
          Folder for {item.title}
        </label>
        <Select
          id={`move-${item.key}`}
          className="h-9 min-h-9 w-full min-w-[9rem] rounded-full border-[var(--line)] bg-[var(--bg-muted)] px-3.5 pr-9 text-xs font-medium shadow-none min-[420px]:w-auto min-[420px]:max-w-[12rem]"
          value={item.folder?.id ?? ''}
          disabled={busy}
          onChange={(e) => onMove(item, e.target.value || null)}
        >
          <option value="">No folder</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
        <span className="hidden flex-1 min-[420px]:block" aria-hidden />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="min-h-9 px-3"
          onClick={() => onOpen(item.key)}
        >
          <Maximize2 className="size-3.5" aria-hidden />
          {isPdf ? 'Read' : 'Practice'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Remove ${item.title} from saved`}
          className="min-h-9 px-3 text-[var(--muted-strong)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
          disabled={busy}
          onClick={() => onRemove(item)}
        >
          <Trash2 className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Remove</span>
        </Button>
      </div>
    </section>
  );
});
