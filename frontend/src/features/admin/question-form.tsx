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
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  kind: 'MCQ' | 'WRITTEN';
  modelAnswer: string;
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
    kind: 'MCQ',
    modelAnswer: '',
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
      <Field>
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          required
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
        />
      </Field>
      <Field>
        <Label htmlFor="content">Question</Label>
        <Textarea
          id="content"
          required
          value={values.content}
          onChange={(e) => setValues((v) => ({ ...v, content: e.target.value }))}
        />
      </Field>
      <Field>
        <Label htmlFor="explanation">Explanation</Label>
        <Textarea
          id="explanation"
          value={values.explanation}
          onChange={(e) => setValues((v) => ({ ...v, explanation: e.target.value }))}
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <Label htmlFor="kind">Type</Label>
          <Select
            id="kind"
            value={values.kind}
            onChange={(e) =>
              setValues((v) => ({ ...v, kind: e.target.value as QuestionFormValues['kind'] }))
            }
          >
            <option value="MCQ">MCQ</option>
            <option value="WRITTEN">Written</option>
          </Select>
        </Field>
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
      </div>
      {values.kind === 'WRITTEN' ? (
        <Field>
          <Label htmlFor="modelAnswer">Model answer</Label>
          <Textarea
            id="modelAnswer"
            required
            value={values.modelAnswer}
            onChange={(e) => setValues((v) => ({ ...v, modelAnswer: e.target.value }))}
            placeholder="The full answer learners see once entitled."
          />
        </Field>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {values.options.map((opt, i) => (
              <Field key={i}>
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
              </Field>
            ))}
          </div>
          <Field>
            <Label htmlFor="correct">Correct option</Label>
            <Select
              id="correct"
              value={values.correct}
              onChange={(e) => setValues((v) => ({ ...v, correct: e.target.value }))}
            >
              {['A', 'B', 'C', 'D'].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </>
      )}
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

export function toQuestionPayload(values: QuestionFormValues) {
  const labels = ['A', 'B', 'C', 'D'];
  const base = {
    title: values.title,
    content: values.content,
    explanation: values.explanation || undefined,
    categoryId: values.categoryId,
    subcategoryId: values.subcategoryId || undefined,
    difficulty: values.difficulty,
    kind: values.kind,
  };
  if (values.kind === 'WRITTEN') {
    // Written questions carry no options; the backend drops stored ones.
    return { ...base, modelAnswer: values.modelAnswer };
  }
  return {
    ...base,
    // Clear any model answer left over from a written version.
    modelAnswer: null,
    options: values.options.map((text, i) => ({
      label: labels[i],
      content: text,
      isCorrect: labels[i] === values.correct,
    })),
  };
}
