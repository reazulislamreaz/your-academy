'use client';

import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type ExamSort = 'newest' | 'oldest' | 'shortest' | 'fewest' | 'most' | 'title';

export const EXAM_SORT_OPTIONS: Array<{ value: ExamSort; label: string }> = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'shortest', label: 'Shortest time' },
  { value: 'fewest', label: 'Fewest questions' },
  { value: 'most', label: 'Most questions' },
  { value: 'title', label: 'Title A–Z' },
];

type Sortable = {
  title: string;
  createdAt?: string | null;
  durationMinutes: number | null;
  questionCount: number;
};

/**
 * Client-side ordering over the rows already loaded (the APIs return newest
 * first and do not accept a sort param).
 */
export function sortExams<T>(items: T[], sort: ExamSort, pick: (item: T) => Sortable): T[] {
  if (sort === 'newest') return items;
  const rows = items.map((item, i) => ({ item, i, s: pick(item) }));
  const byIndex = (a: { i: number }, b: { i: number }) => a.i - b.i;
  rows.sort((a, b) => {
    switch (sort) {
      case 'oldest':
        return b.i - a.i;
      case 'shortest':
        return (
          (a.s.durationMinutes ?? Number.POSITIVE_INFINITY) -
            (b.s.durationMinutes ?? Number.POSITIVE_INFINITY) || byIndex(a, b)
        );
      case 'fewest':
        return a.s.questionCount - b.s.questionCount || byIndex(a, b);
      case 'most':
        return b.s.questionCount - a.s.questionCount || byIndex(a, b);
      case 'title':
        return a.s.title.localeCompare(b.s.title) || byIndex(a, b);
      default:
        return byIndex(a, b);
    }
  });
  return rows.map((r) => r.item);
}

export const filterSelectClass =
  'h-11 min-h-11 border-[var(--line)] bg-[var(--bg-elevated)] shadow-none';

type Props = {
  idPrefix: string;
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder: string;
  sort: ExamSort;
  onSort: (value: ExamSort) => void;
  /** Extra filter selects (category, year…). */
  filters?: ReactNode;
  summary?: ReactNode;
  className?: string;
};

/** Search + filters + sort bar for exam listings. */
export function ExamListToolbar({
  idPrefix,
  search,
  onSearch,
  searchPlaceholder,
  sort,
  onSort,
  filters,
  summary,
  className,
}: Props) {
  return (
    <div
      className={cn(
        'rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] sm:p-3.5',
        className,
      )}
    >
      <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center">
        <SearchField
          id={`${idPrefix}-search`}
          value={search}
          onChange={onSearch}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          autoComplete="off"
          className="min-w-0 flex-1"
        />
        <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:flex lg:shrink-0 lg:items-center">
          {filters}
          <Label htmlFor={`${idPrefix}-sort`} className="sr-only">
            Sort
          </Label>
          <Select
            id={`${idPrefix}-sort`}
            value={sort}
            onChange={(e) => onSort(e.target.value as ExamSort)}
            className={cn(filterSelectClass, 'lg:w-[11.5rem]')}
          >
            {EXAM_SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {summary ? <div className="mt-2 text-xs text-[var(--muted-strong)]">{summary}</div> : null}
    </div>
  );
}
