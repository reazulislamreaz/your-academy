'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Label } from '@/components/ui/label';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import type { CategoryNode } from '@/lib/api/types';
import { EXAM_TRACKS } from '@/lib/exam-tags';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

type Props = {
  categories: CategoryNode[];
};

function buildHref(next: {
  q: string;
  categoryId: string;
  subcategoryId: string;
  difficulty: string;
  examTag: string;
}): string {
  const sp = new URLSearchParams();
  if (next.q) sp.set('q', next.q);
  if (next.categoryId) sp.set('categoryId', next.categoryId);
  if (next.subcategoryId) sp.set('subcategoryId', next.subcategoryId);
  if (next.difficulty) sp.set('difficulty', next.difficulty);
  if (next.examTag) sp.set('examTag', next.examTag);
  return sp.toString() ? `/questions?${sp.toString()}` : '/questions';
}

export function QuestionFilters({ categories }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  // Applied filters come from the URL (links, back/forward, refresh).
  const appliedQ = params.get('q') ?? '';
  const categoryId = params.get('categoryId') ?? '';
  const subcategoryId = params.get('subcategoryId') ?? '';
  const difficulty = params.get('difficulty') ?? '';
  const examTag = params.get('examTag') ?? '';

  const [q, setQ] = useState(appliedQ);
  const debouncedQ = useDebouncedValue(q.trim(), 350);
  const skipUrlPush = useRef(false);

  const selected = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const advancedActive = Boolean(categoryId || subcategoryId || difficulty || examTag);

  // Keep the search box aligned when navigation changes `q`.
  useEffect(() => {
    skipUrlPush.current = true;
    setQ(appliedQ);
  }, [appliedQ]);

  // Debounced search → URL (preserve other filters).
  useEffect(() => {
    if (skipUrlPush.current) {
      skipUrlPush.current = false;
      return;
    }
    if (debouncedQ === appliedQ) return;

    startTransition(() => {
      router.push(
        buildHref({
          q: debouncedQ,
          categoryId,
          subcategoryId,
          difficulty,
          examTag,
        }),
      );
    });
  }, [
    debouncedQ,
    appliedQ,
    categoryId,
    subcategoryId,
    difficulty,
    examTag,
    router,
  ]);

  function pushFilters(next: {
    q?: string;
    categoryId?: string;
    subcategoryId?: string;
    difficulty?: string;
    examTag?: string;
  }) {
    startTransition(() => {
      router.push(
        buildHref({
          q: next.q ?? appliedQ,
          categoryId: next.categoryId ?? '',
          subcategoryId: next.subcategoryId ?? '',
          difficulty: next.difficulty ?? '',
          examTag: next.examTag ?? '',
        }),
      );
    });
  }

  function clearAll() {
    skipUrlPush.current = true;
    setQ('');
    startTransition(() => {
      router.push('/questions');
    });
  }

  const fieldProps = {
    categories,
    selected,
    categoryId,
    subcategoryId,
    difficulty,
    examTag,
    setCategoryId: (value: string) =>
      pushFilters({
        q: appliedQ,
        categoryId: value,
        subcategoryId: '',
        difficulty,
        examTag,
      }),
    setSubcategoryId: (value: string) =>
      pushFilters({
        q: appliedQ,
        categoryId,
        subcategoryId: value,
        difficulty,
        examTag,
      }),
    setDifficulty: (value: string) =>
      pushFilters({
        q: appliedQ,
        categoryId,
        subcategoryId,
        difficulty: value,
        examTag,
      }),
    setExamTag: (value: string) =>
      pushFilters({
        q: appliedQ,
        categoryId,
        subcategoryId,
        difficulty,
        examTag: value,
      }),
  };

  return (
    <div className="ya-glass z-10 grid min-w-0 gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 shadow-[var(--shadow-sm)] sm:p-4 lg:sticky lg:top-[calc(var(--header-h,3.75rem)+0.75rem)] [&>*]:min-w-0">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field>
          <Label htmlFor="q-search">Search</Label>
          <SearchField
            id="q-search"
            value={q}
            onChange={setQ}
            placeholder="Search by title or content…"
            aria-label="Search questions by title or content"
            disabled={pending}
            onClear={() => {
              skipUrlPush.current = true;
              pushFilters({
                q: '',
                categoryId,
                subcategoryId,
                difficulty,
                examTag,
              });
            }}
          />
        </Field>
        <Button
          type="button"
          variant="ghost"
          disabled={pending || (!q && !advancedActive)}
          onClick={clearAll}
        >
          Clear
        </Button>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">
        <AdvancedFields idPrefix="desk" {...fieldProps} />
      </div>

      <details className="md:hidden" open={advancedActive || undefined}>
        <summary className="cursor-pointer list-none rounded-[var(--radius)] border border-[var(--line)] px-3 py-2.5 text-sm font-semibold text-[var(--ink-soft)] marker:content-none [&::-webkit-details-marker]:hidden">
          More filters{advancedActive ? ' · active' : ''}
        </summary>
        <div className="mt-3 grid gap-3">
          <AdvancedFields idPrefix="mobile" {...fieldProps} />
        </div>
      </details>
    </div>
  );
}

function AdvancedFields({
  idPrefix,
  categories,
  selected,
  categoryId,
  subcategoryId,
  difficulty,
  examTag,
  setCategoryId,
  setSubcategoryId,
  setDifficulty,
  setExamTag,
}: {
  idPrefix: string;
  categories: CategoryNode[];
  selected: CategoryNode | undefined;
  categoryId: string;
  subcategoryId: string;
  difficulty: string;
  examTag: string;
  setCategoryId: (v: string) => void;
  setSubcategoryId: (v: string) => void;
  setDifficulty: (v: string) => void;
  setExamTag: (v: string) => void;
}) {
  const catId = `${idPrefix}-q-cat`;
  const subId = `${idPrefix}-q-sub`;
  const diffId = `${idPrefix}-q-diff`;
  const examId = `${idPrefix}-q-exam`;

  return (
    <>
      <Field>
        <Label htmlFor={catId}>Category</Label>
        <Select
          id={catId}
          value={categoryId}
          onChange={(e) => {
            setCategoryId(e.target.value);
          }}
        >
          <option value="">All</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field>
        <Label htmlFor={subId}>Subcategory</Label>
        <Select
          id={subId}
          value={subcategoryId}
          onChange={(e) => setSubcategoryId(e.target.value)}
          disabled={!selected}
        >
          <option value="">All</option>
          {selected?.children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field>
        <Label htmlFor={diffId}>Difficulty</Label>
        <Select id={diffId} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
          <option value="">All</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </Select>
      </Field>
      <Field>
        <Label htmlFor={examId}>Exam track</Label>
        <Select id={examId} value={examTag} onChange={(e) => setExamTag(e.target.value)}>
          <option value="">All</option>
          {EXAM_TRACKS.map((t) => (
            <option key={t.tag} value={t.tag}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
    </>
  );
}
