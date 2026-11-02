'use client';

import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CategoryNode } from '@/lib/api/types';

const selectClass =
  'h-11 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 text-sm outline-none focus:border-[var(--ink)] focus:shadow-[0_0_0_3px_var(--highlight-soft)]';

export type QuestionFormValues = {
  title: string;
  content: string;
  explanation: string;
  categoryId: string;
  subcategoryId: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: string[];
  correct: string;
};

type Props = {
  categories: CategoryNode[];
  initial: QuestionFormValues;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (values: QuestionFormValues) => void;
};

export function emptyQuestionForm(categoryId = ''): QuestionFormValues {
  return {
    title: '',
    content: '',
    explanation: '',
    categoryId,
    subcategoryId: '',
    difficulty: 'MEDIUM',
    options: ['', '', '', ''],
    correct: 'A',
  };
}

export function QuestionForm({
  categories,
  initial,
  submitLabel,
  pending,
  error,
  onSubmit,
}: Props) {
  const [values, setValues] = useState(initial);
  const selected = useMemo(
    () => categories.find((c) => c.id === values.categoryId),
    [categories, values.categoryId],
  );

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="content">Question</Label>
        <Textarea
          id="content"
          required
          value={values.content}
          onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="explanation">Explanation</Label>
        <Textarea
          id="explanation"
          value={values.explanation}
          onChange={(e) => setValues((v) => ({ ...v, explanation: e.target.value }))}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            className={selectClass}
            required
            value={values.categoryId}
            onChange={(e) =>
              setValues((v) => ({ ...v, categoryId: e.target.value, subcategoryId: '' }))
            }
          >
            <option value="">Select</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="sub">Subcategory</Label>
          <select
            id="sub"
            className={selectClass}
            value={values.subcategoryId}
            onChange={(e) => setValues((v) => ({ ...v, subcategoryId: e.target.value }))}
          >
            <option value="">Optional</option>
            {selected?.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="diff">Difficulty</Label>
          <select
            id="diff"
            className={selectClass}
            value={values.difficulty}
            onChange={(e) =>
              setValues((v) => ({
                ...v,
                difficulty: e.target.value as QuestionFormValues['difficulty'],
              }))
            }
          >
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {values.options.map((opt, i) => (
          <div key={i} className="space-y-2">
            <Label htmlFor={`opt-${i}`}>Option {['A', 'B', 'C', 'D'][i]}</Label>
            <Input
              id={`opt-${i}`}
              required
              value={opt}
              onChange={(e) =>
                setValues((v) => ({
                  ...v,
                  options: v.options.map((p, idx) => (idx === i ? e.target.value : p)),
                }))
              }
            />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Label htmlFor="correct">Correct option</Label>
        <select
          id="correct"
          className={selectClass}
          value={values.correct}
          onChange={(e) => setValues((v) => ({ ...v, correct: e.target.value }))}
        >
          {['A', 'B', 'C', 'D'].map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </div>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

export function toQuestionPayload(values: QuestionFormValues) {
  const labels = ['A', 'B', 'C', 'D'];
  return {
    title: values.title,
    content: values.content,
    explanation: values.explanation || undefined,
    categoryId: values.categoryId,
    subcategoryId: values.subcategoryId || undefined,
    difficulty: values.difficulty,
    options: values.options.map((text, i) => ({
      label: labels[i],
      content: text,
      isCorrect: labels[i] === values.correct,
    })),
  };
}
