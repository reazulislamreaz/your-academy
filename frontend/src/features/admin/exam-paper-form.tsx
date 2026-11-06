'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

export type ExamPaperFormValues = {
  title: string;
  slug: string;
  examBody: string;
  year: string;
  description: string;
  durationMinutes: string;
  totalMarks: string;
  isPublished: boolean;
};

type Props = {
  initial: ExamPaperFormValues;
  submitLabel: string;
  pending?: boolean;
  error?: string | null;
  onSubmit: (values: ExamPaperFormValues) => void;
};

export function emptyExamPaperForm(): ExamPaperFormValues {
  return {
    title: '',
    slug: '',
    examBody: 'BCS',
    year: '',
    description: '',
    durationMinutes: '60',
    totalMarks: '',
    isPublished: false,
  };
}

export function ExamPaperForm({ initial, submitLabel, pending, error, onSubmit }: Props) {
  const [values, setValues] = useState(initial);

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
          placeholder="e.g. BCS 45th Preliminary"
        />
      </Field>
      <div className="grid gap-3 md:grid-cols-3">
        <Field>
          <Label htmlFor="slug">Slug (optional — auto from title)</Label>
          <Input
            id="slug"
            value={values.slug}
            onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value }))}
            placeholder="bcs-45th-preliminary"
          />
        </Field>
        <Field>
          <Label htmlFor="examBody">Exam body</Label>
          <Input
            id="examBody"
            required
            value={values.examBody}
            onChange={(e) => setValues((v) => ({ ...v, examBody: e.target.value }))}
            placeholder="BCS, Bank, Primary, NTRCA, PSC, Law…"
          />
        </Field>
        <Field>
          <Label htmlFor="year">Year (optional)</Label>
          <Input
            id="year"
            type="number"
            min={1900}
            max={2100}
            value={values.year}
            onChange={(e) => setValues((v) => ({ ...v, year: e.target.value }))}
          />
        </Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field>
          <Label htmlFor="duration">Duration (minutes)</Label>
          <Input
            id="duration"
            type="number"
            required
            min={1}
            value={values.durationMinutes}
            onChange={(e) => setValues((v) => ({ ...v, durationMinutes: e.target.value }))}
          />
        </Field>
        <Field>
          <Label htmlFor="marks">Total marks (optional)</Label>
          <Input
            id="marks"
            type="number"
            min={0}
            value={values.totalMarks}
            onChange={(e) => setValues((v) => ({ ...v, totalMarks: e.target.value }))}
          />
        </Field>
      </div>
      <Field>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={values.isPublished}
          onChange={(e) => setValues((v) => ({ ...v, isPublished: e.target.checked }))}
        />
        Published (visible in the public paper list)
      </label>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </Button>
    </form>
  );
}

export function toExamPaperPayload(values: ExamPaperFormValues) {
  const year = values.year.trim() ? Number(values.year) : undefined;
  const totalMarks = values.totalMarks.trim() ? Number(values.totalMarks) : undefined;
  return {
    title: values.title,
    slug: values.slug.trim() || undefined,
    examBody: values.examBody,
    year,
    description: values.description || undefined,
    durationMinutes: Number(values.durationMinutes),
    totalMarks,
    isPublished: values.isPublished,
  };
}
