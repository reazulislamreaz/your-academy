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

  return (
    <form
      className="z-10 grid min-w-0 gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]/95 p-3 shadow-[var(--shadow-sm)] backdrop-blur-md sm:grid-cols-2 sm:p-4 xl:sticky xl:top-16 xl:grid-cols-6 [&>*]:min-w-0"
      onSubmit={(e) => {
        e.preventDefault();
        apply();
      }}
    >
      <Field className="xl:col-span-2">
        <Label htmlFor="q-search">Search</Label>
        <Input
          id="q-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Title or content"
        />
      </Field>
      <Field>
        <Label htmlFor="q-cat">Category</Label>
        <Select
          id="q-cat"
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
        <Label htmlFor="q-sub">Subcategory</Label>
        <Select
          id="q-sub"
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
        <Label htmlFor="q-diff">Difficulty</Label>
        <Select
          id="q-diff"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">All</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
        </Select>
      </Field>
      <Field>
        <Label htmlFor="q-exam">Exam track</Label>
        <Select id="q-exam" value={examTag} onChange={(e) => setExamTag(e.target.value)}>
          <option value="">All</option>
          {EXAM_TRACKS.map((t) => (
            <option key={t.tag} value={t.tag}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex flex-wrap items-end gap-2 sm:col-span-2 xl:col-span-6">
        <Button type="submit" disabled={pending}>
          {pending ? 'Filtering…' : 'Apply filters'}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => apply({ clear: true })}>
          Clear
        </Button>
      </div>
    </form>
  );
}
