'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { CategoryNode } from '@/lib/api/types';
import { EXAM_TRACKS } from '@/lib/exam-tags';

type Props = {
  categories: CategoryNode[];
};

export function QuestionFilters({ categories }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [q, setQ] = useState(params.get('q') ?? '');
  const [categoryId, setCategoryId] = useState(params.get('categoryId') ?? '');
  const [subcategoryId, setSubcategoryId] = useState(params.get('subcategoryId') ?? '');
  const [difficulty, setDifficulty] = useState(params.get('difficulty') ?? '');
  const [examTag, setExamTag] = useState(params.get('examTag') ?? '');

  useEffect(() => {
    setQ(params.get('q') ?? '');
    setCategoryId(params.get('categoryId') ?? '');
    setSubcategoryId(params.get('subcategoryId') ?? '');
    setDifficulty(params.get('difficulty') ?? '');
    setExamTag(params.get('examTag') ?? '');
  }, [params]);

  const selected = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  const advancedActive = Boolean(categoryId || subcategoryId || difficulty || examTag);

  function apply(next?: { clear?: boolean }) {
    const sp = new URLSearchParams();
    if (!next?.clear) {
      if (q.trim()) sp.set('q', q.trim());
      if (categoryId) sp.set('categoryId', categoryId);
      if (subcategoryId) sp.set('subcategoryId', subcategoryId);
      if (difficulty) sp.set('difficulty', difficulty);
      if (examTag) sp.set('examTag', examTag);
    }
    startTransition(() => {
      router.push(sp.toString() ? `/questions?${sp.toString()}` : '/questions');
    });
  }

  const fieldProps = {
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
  };

  return (
    <form
      className="ya-glass z-10 grid min-w-0 gap-3 rounded-[var(--radius-lg)] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-3 shadow-[var(--shadow-sm)] sm:p-4 xl:sticky xl:top-[var(--header-h,4rem)] [&>*]:min-w-0"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <Field>
          <Label htmlFor="q-search">Search</Label>
          <Input
            id="q-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Title or content"
          />
        </Field>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <Button type="submit" disabled={pending}>
            {pending ? 'Filtering…' : 'Apply'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={pending}
            onClick={() => apply({ clear: true })}
          >
            Clear
          </Button>
        </div>
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
    </form>
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
            setSubcategoryId('');
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
