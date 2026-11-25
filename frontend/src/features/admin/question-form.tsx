'use client';

import { useMemo, useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { CategoryNode } from '@/lib/api/types';

export type QuestionFormValues = {
  title: string;
  content: string;
  explanation: string;
  categoryId: string;
  subcategoryId: string;
  /** ISO date YYYY-MM-DD */
  questionDate: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  options: string[];
  correct: string;
  /**
   * IBA question: 5 options (Option E shown). `undefined` = never touched → not sent, so a
   * regular question's save request is exactly as before.
   */
  isIba?: boolean;
};

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

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
    questionDate: '',
    difficulty: 'MEDIUM',
    options: ['', '', '', ''],
    correct: '',
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
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <section className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Stem
          </h3>
          <p className="mt-1 text-xs text-[var(--muted-strong)]">
            Title appears in lists; the question body is what learners read.
          </p>
        </div>
        <Field>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            required
            value={values.title}
            onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
            placeholder="Short list title"
          />
        </Field>
        <Field>
          <Label htmlFor="content">Question</Label>
          <Textarea
            id="content"
            required
            className="min-h-28"
            value={values.content}
            onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
            placeholder="Full MCQ prompt…"
          />
        </Field>
        <Field>
          <Label htmlFor="explanation">Explanation (optional)</Label>
          <Textarea
            id="explanation"
            value={values.explanation}
            onChange={(e) => setValues((v) => ({ ...v, explanation: e.target.value }))}
            placeholder="Shown to entitled learners after answering"
          />
        </Field>
      </section>

      <section className="space-y-4 border-t border-[var(--line)] pt-6">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Classification
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <Label htmlFor="category">Category</Label>
            <Select
              id="category"
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
            </Select>
          </Field>
          <Field>
            <Label htmlFor="sub">Subcategory</Label>
            <Select
              id="sub"
              value={values.subcategoryId}
              onChange={(e) => setValues((v) => ({ ...v, subcategoryId: e.target.value }))}
            >
              <option value="">Optional</option>
              {selected?.children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field>
            <Label htmlFor="diff">Difficulty</Label>
            <Select
              id="diff"
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
            </Select>
          </Field>
          <Field>
            <Label htmlFor="question-date">Question date</Label>
            <Input
              id="question-date"
              type="date"
              value={values.questionDate}
              onChange={(e) => setValues((v) => ({ ...v, questionDate: e.target.value }))}
            />
          </Field>
        </div>
      </section>

      <section className="space-y-4 border-t border-[var(--line)] pt-6">
        <div>
          <h3 className="text-sm font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Answer options
          </h3>
          <p className="mt-1 text-xs text-[var(--muted-strong)]">
            Exactly one option must be marked correct before publishing. Missing answers are allowed
            while drafting.
          </p>
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2 text-sm font-medium text-[var(--ink)]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--highlight)]"
            checked={Boolean(values.isIba)}
            onChange={(e) => {
              const on = e.target.checked;
              setValues((v) => ({
                ...v,
                isIba: on,
                // IBA = 5 options; switching back drops Option E (and an E answer).
                options: on ? [...v.options.slice(0, 4), v.options[4] ?? ''] : v.options.slice(0, 4),
                correct: !on && v.correct === 'E' ? '' : v.correct,
              }));
            }}
          />
          IBA question (5 options)
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {values.options.map((opt, i) => {
            const label = OPTION_LETTERS[i]!;
            const isMarked = values.correct === label;
            return (
              <Field key={i}>
                <Label htmlFor={`opt-${i}`}>Option {label}</Label>
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
                  className={
                    isMarked
                      ? 'border-[var(--success)]/50 bg-[var(--success-soft)]'
                      : undefined
                  }
                />
              </Field>
            );
          })}
        </div>
        <Field className="max-w-xs">
          <Label htmlFor="correct">Correct option</Label>
          <Select
            id="correct"
            value={values.correct}
            onChange={(e) => setValues((v) => ({ ...v, correct: e.target.value }))}
          >
            <option value="">None (missing)</option>
            {OPTION_LETTERS.slice(0, values.options.length).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </section>

      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className="border-t border-[var(--line)] pt-4">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function toQuestionPayload(values: QuestionFormValues) {
  const labels = OPTION_LETTERS;
  return {
    title: values.title,
    content: values.content,
    explanation: values.explanation || undefined,
    categoryId: values.categoryId,
    subcategoryId: values.subcategoryId || undefined,
    difficulty: values.difficulty,
    questionDate: values.questionDate || undefined,
    options: values.options.map((text, i) => ({
      label: labels[i],
      content: text,
      isCorrect: Boolean(values.correct) && labels[i] === values.correct,
    })),
    ...(values.isIba !== undefined ? { isIba: values.isIba } : {}),
  };
}
