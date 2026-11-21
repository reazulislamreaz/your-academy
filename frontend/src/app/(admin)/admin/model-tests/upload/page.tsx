'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminFormPanel, AdminPage, AdminSection } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { FileDropzone } from '@/features/admin/question-imports/file-dropzone';
import { ApiError } from '@/lib/api/client';
import {
  deleteAdminModelTest,
  listAdminModelTests,
  updateAdminModelTest,
  uploadAdminModelTest,
} from '@/lib/api/model-tests';
import { adminDownloadUrl } from '@/lib/api/upload';
import type { AdminModelTestUploadResult } from '@your-academy/shared';

const TEMPLATE_COLUMNS = [
  { name: 'প্রশ্ন নং', hint: 'Question number (optional / reference)' },
  { name: 'প্রশ্ন', hint: 'Question stem (required)' },
  { name: 'ক', hint: 'Option A (required)' },
  { name: 'খ', hint: 'Option B (required)' },
  { name: 'গ', hint: 'Option C (required)' },
  { name: 'ঘ', hint: 'Option D (required)' },
  { name: 'উত্তর', hint: 'a, b, c, or d (required; ক–ঘ also OK)' },
] as const;

export default function AdminModelTestUploadPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationInMinutes, setDurationInMinutes] = useState('60');
  const [examYear, setExamYear] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AdminModelTestUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tests = useQuery({
    queryKey: ['admin-model-tests'],
    queryFn: listAdminModelTests,
  });

  const upload = useMutation({
    mutationFn: uploadAdminModelTest,
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setFile(null);
      if (!title.trim() && data.suggestedTitle) setTitle(data.suggestedTitle);
      void qc.invalidateQueries({ queryKey: ['admin-model-tests'] });
    },
    onError: (err) => {
      setResult(null);
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    },
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      updateAdminModelTest(id, { isPublished: next }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-model-tests'] }),
  });

  const remove = useMutation({
    mutationFn: deleteAdminModelTest,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-model-tests'] }),
  });

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Model tests"
        title="Upload Model Test from Excel"
        description="Create a public timed Model Test. Header row may sit below title/date banner rows — columns: প্রশ্ন নং, প্রশ্ন, ক, খ, গ, ঘ, উত্তর with a–d (or ক–ঘ) answer keys."
      />

      <AdminSection title="Spreadsheet format">
        <AdminFormPanel title="Required columns">
          <p className="mb-3 text-sm text-[var(--muted-strong)]">
            Optional preamble rows (exam title, date/marks) are supported. The importer finds the
            header containing <strong className="text-[var(--ink)]">প্রশ্ন নং</strong> and{' '}
            <strong className="text-[var(--ink)]">প্রশ্ন</strong>.
          </p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted-strong)]">
            {TEMPLATE_COLUMNS.map((col) => (
              <li key={col.name}>
                <span className="font-medium text-[var(--ink)]">{col.name}</span> — {col.hint}
              </li>
            ))}
          </ul>
        </AdminFormPanel>
      </AdminSection>

      <AdminSection title="Create from Excel">
        <AdminFormPanel title="New Model Test">
          <div className="grid gap-4">
            <Field>
              <Label htmlFor="mt-title">Model Test title</Label>
              <Input
                id="mt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Leave blank to use title from Excel preamble"
              />
            </Field>
            <Field>
              <Label htmlFor="mt-desc">Description (optional)</Label>
              <Textarea
                id="mt-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Optional — preamble date/marks line is used when empty"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field>
                <Label htmlFor="mt-duration">Duration (minutes)</Label>
                <Input
                  id="mt-duration"
                  type="number"
                  min={1}
                  max={600}
                  value={durationInMinutes}
                  onChange={(e) => setDurationInMinutes(e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="mt-year">Exam year (optional)</Label>
                <Input
                  id="mt-year"
                  type="number"
                  min={1900}
                  max={2100}
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                  placeholder="Auto from sheet"
                />
              </Field>
              <Field>
                <Label htmlFor="mt-published">Visibility</Label>
                <select
                  id="mt-published"
                  value={isPublished ? 'published' : 'draft'}
                  onChange={(e) => setIsPublished(e.target.value === 'published')}
                  className="h-10 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)] px-3 text-sm"
                >
                  <option value="published">Published</option>
                  <option value="draft">Hidden</option>
                </select>
              </Field>
            </div>

            <FileDropzone file={file} onFileChange={setFile} disabled={upload.isPending} />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="h-11 w-full sm:h-10 sm:w-auto"
                disabled={upload.isPending || !file}
                onClick={() => {
                  if (!file) return;
                  upload.mutate({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    durationInMinutes: Number(durationInMinutes),
                    examYear: examYear.trim() ? Number(examYear) : undefined,
                    isPublished,
                    file,
                  });
                }}
              >
                {upload.isPending ? 'Uploading…' : 'Create Model Test'}
              </Button>
              <a
                href={adminDownloadUrl('/admin/model-tests/template')}
                className="block w-full sm:inline-flex sm:w-auto"
              >
                <Button type="button" variant="outline" className="h-11 w-full sm:h-10 sm:w-auto">
                  Download template (7-col .xlsx)
                </Button>
              </a>
            </div>

            {error ? <Alert variant="danger">{error}</Alert> : null}
            {result ? (
              <Alert>
                Created <strong>{result.title}</strong> with {result.totalQuestions} questions (
                {result.durationInMinutes} mins
                {result.examYear ? ` · ${result.examYear}` : ''}; header row{' '}
                {result.headerRowNumber}).{' '}
                <Link href={`/model-test/${result.slug}`} className="font-semibold underline">
                  Open public Model Test
                </Link>
                {result.parseWarnings.length ? (
                  <p className="mt-2 text-sm">Warnings: {result.parseWarnings.join('; ')}</p>
                ) : null}
              </Alert>
            ) : null}

            {result?.preview?.length ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[var(--ink)]">Preview (first rows)</h3>
                <ul className="space-y-2">
                  {result.preview.map((q, i) => (
                    <li
                      key={q.id}
                      className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)] p-3 text-sm"
                    >
                      <p className="font-medium text-[var(--ink)]">
                        {i + 1}. {q.questionText}
                      </p>
                      <p className="mt-1 text-[var(--muted-strong)]">Correct: {q.correctAnswer}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </AdminFormPanel>
      </AdminSection>

      <AdminSection title="Existing Model Tests">
        <AdminFormPanel title="Manage">
          {tests.isLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : tests.data?.length ? (
            <ul className="divide-y divide-[var(--line)]">
              {tests.data.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                >
                  <div className="min-w-0">
                    <p className="font-medium break-words text-[var(--ink)]">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {item.totalQuestions} Q · {item.durationInMinutes} mins
                      {item.examYear ? ` · ${item.examYear}` : ''} · {item._count.attempts} attempts
                      · {item.isPublished ? 'Published' : 'Hidden'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <Link href={`/model-test/${item.slug}`}>
                      <Button size="sm" variant="outline" className="h-10">
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10"
                      disabled={togglePublish.isPending}
                      onClick={() =>
                        togglePublish.mutate({ id: item.id, next: !item.isPublished })
                      }
                    >
                      {item.isPublished ? 'Hide' : 'Publish'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-10 text-[var(--danger)]"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `Delete “${item.title}”? This removes all questions and attempts.`,
                          )
                        ) {
                          remove.mutate(item.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">No Model Tests yet.</p>
          )}
        </AdminFormPanel>
      </AdminSection>
    </AdminPage>
  );
}
