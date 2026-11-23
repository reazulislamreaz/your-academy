'use client';

import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminFormPanel, AdminPage, AdminSection } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExamGuideEditor } from '@/features/admin/exams/exam-guide-editor';
import { FileDropzone } from '@/features/admin/question-imports/file-dropzone';
import { ApiError } from '@/lib/api/client';
import { deleteAdminExam, listAdminExams, uploadAdminExam } from '@/lib/api/exams';
import { revalidateExamsCache } from '@/lib/api/revalidate-exams';
import { Badge } from '@/components/ui/badge';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { adminDownloadUrl } from '@/lib/api/upload';
import type { AdminExamUploadResult } from '@your-academy/shared';

const TEMPLATE_COLUMNS = [
  { name: 'প্রশ্ন নং', hint: 'Question number (optional / reference)' },
  { name: 'প্রশ্ন', hint: 'Question stem (required)' },
  { name: 'ক', hint: 'Option A (required)' },
  { name: 'খ', hint: 'Option B (required)' },
  { name: 'গ', hint: 'Option C (required)' },
  { name: 'ঘ', hint: 'Option D (required)' },
  { name: 'উত্তর', hint: 'a, b, c, or d (required)' },
] as const;

const SAMPLE_PREVIEW = [
  ['1', '‘পরাগলী মহাভারত’ খ্যাত গ্রন্থের অনুবাদকের নাম কী?', 'সঞ্জয়', 'কবীন্দ্র পরমেশ্বর', 'শ্রীকর নন্দী', 'কাশীরাম দাস', 'b'],
  ['2', 'সন্ধি কাকে বলে?', 'পরপর দুই ধ্বনির মিলন', 'শুধু সমাস', 'শুধু প্রত্যয়', 'শুধু উপসর্গ', 'a'],
] as const;

export default function AdminExamUploadPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationInMinutes, setDurationInMinutes] = useState('15');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AdminExamUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const exams = useInfiniteQuery({
    queryKey: ['admin-exams'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => listAdminExams({ cursor: pageParam, limit: 20 }),
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });
  const examItems = exams.data?.pages.flatMap((p) => p.data) ?? [];

  const [listError, setListError] = useState<string | null>(null);
  const removeExam = useMutation({
    mutationFn: deleteAdminExam,
    onSuccess: async () => {
      setListError(null);
      void qc.invalidateQueries({ queryKey: ['admin-exams'] });
      await revalidateExamsCache();
    },
    onError: (err) => setListError(err instanceof ApiError ? err.message : 'Delete failed'),
  });

  const upload = useMutation({
    mutationFn: uploadAdminExam,
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setFile(null);
      void qc.invalidateQueries({ queryKey: ['admin-exams'] });
      void revalidateExamsCache();
    },
    onError: (err) => {
      setResult(null);
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    },
  });

  return (
    <AdminPage>
      <PageHeader
        title="Quiz"
        description="Upload Excel · edit, unpublish, or delete quizzes · edit the listing guide."
      />

      <AdminSection title="Listing guide">
        <ExamGuideEditor />
      </AdminSection>

      <AdminSection title="Spreadsheet format">
        <AdminFormPanel title="Required columns">
          <p className="mb-3 text-sm text-[var(--muted-strong)]">
            Download the sample template or build an <code className="text-[var(--ink)]">.xlsx</code>{' '}
            with exactly these headers. Blank spacer rows are skipped. <strong>প্রশ্ন নং</strong> may
            be blank or non-sequential. Multi-line cells and Bengali text are supported.
          </p>
          <div className="overflow-x-auto rounded-[var(--radius)] border border-[var(--line)]">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-[var(--bg-desk)]">
                <tr>
                  {TEMPLATE_COLUMNS.map((col) => (
                    <th
                      key={col.name}
                      className="border-b border-[var(--line)] px-3 py-2 font-semibold text-[var(--ink)] whitespace-nowrap"
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SAMPLE_PREVIEW.map((row, idx) => (
                  <tr key={idx} className="odd:bg-[var(--bg-elevated)]">
                    {row.map((cell, i) => (
                      <td
                        key={`${idx}-${i}`}
                        className="max-w-[14rem] truncate border-b border-[var(--line)] px-3 py-2 text-[var(--muted-strong)]"
                        title={cell}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[var(--muted-strong)]">
            {TEMPLATE_COLUMNS.map((col) => (
              <li key={col.name}>
                <span className="font-medium text-[var(--ink)]">{col.name}</span> — {col.hint}
              </li>
            ))}
          </ul>
        </AdminFormPanel>
      </AdminSection>

      <AdminSection title="Create from Excel">
        <AdminFormPanel title="New exam">
          <div className="grid gap-4">
            <Field>
              <Label htmlFor="exam-title">Exam title</Label>
              <Input
                id="exam-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="BCS Preliminary Model Test 01"
              />
            </Field>
            <Field>
              <Label htmlFor="exam-desc">Description (optional)</Label>
              <Textarea
                id="exam-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </Field>
            <Field>
              <Label htmlFor="exam-duration">Duration (minutes)</Label>
              <Input
                id="exam-duration"
                type="number"
                min={1}
                max={600}
                value={durationInMinutes}
                onChange={(e) => setDurationInMinutes(e.target.value)}
              />
            </Field>

            <FileDropzone file={file} onFileChange={setFile} disabled={upload.isPending} />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="h-11 w-full sm:h-10 sm:w-auto"
                disabled={upload.isPending || !file || !title.trim()}
                onClick={() => {
                  if (!file) return;
                  upload.mutate({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    durationInMinutes: Number(durationInMinutes),
                    file,
                  });
                }}
              >
                {upload.isPending ? 'Uploading…' : 'Create exam'}
              </Button>
              <a href={adminDownloadUrl('/admin/exams/template')} className="block w-full sm:inline-flex sm:w-auto">
                <Button type="button" variant="outline" className="h-11 w-full sm:h-10 sm:w-auto">
                  Download template (7-col .xlsx)
                </Button>
              </a>
            </div>

            {error ? <Alert variant="danger">{error}</Alert> : null}
            {result ? (
              <Alert>
                Created <strong>{result.title}</strong> with {result.totalQuestions} questions (
                {result.durationInMinutes} mins).{' '}
                <Link href={`/exams/${encodeURIComponent(result.slug)}`} className="font-semibold underline">
                  Open public exam
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
                      <p className="mt-1 text-[var(--muted-strong)]">
                        Correct: {q.correctAnswer}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </AdminFormPanel>
      </AdminSection>

      <AdminSection title="Existing exams">
        <AdminFormPanel title="All quizzes">
          {listError ? <Alert variant="danger" className="mb-3">{listError}</Alert> : null}
          {exams.isLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : examItems.length ? (
            <>
              <ul className="divide-y divide-[var(--line)]">
                {examItems.map((exam) => (
                  <li
                    key={exam.id}
                    className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                  >
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium break-words text-[var(--ink)]">
                        {exam.title}
                        {exam.isPublished ? null : <Badge variant="warning">Draft</Badge>}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {exam.totalQuestions} Q · {exam.durationInMinutes} mins ·{' '}
                        {exam._count.attempts} attempts
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Link href={`/exams/${encodeURIComponent(exam.slug)}`}>
                        <Button size="sm" variant="outline" className="h-10">
                          View
                        </Button>
                      </Link>
                      <Link href={`/admin/exams/${exam.id}`}>
                        <Button size="sm" variant="outline" className="h-10">
                          Edit
                        </Button>
                      </Link>
                      <ConfirmButton
                        size="sm"
                        variant="ghost"
                        className="h-10 text-[var(--highlight)]"
                        confirmTitle="Delete this quiz?"
                        confirmMessage={`Delete “${exam.title}”${exam._count.attempts ? ` and ${exam._count.attempts} attempt(s)` : ''}? This cannot be undone.`}
                        confirmLabel="Delete quiz"
                        onConfirm={() => removeExam.mutateAsync(exam.id)}
                      >
                        Delete
                      </ConfirmButton>
                    </div>
                  </li>
                ))}
              </ul>
              {exams.hasNextPage ? (
                <div className="mt-3 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={exams.isFetchingNextPage}
                    onClick={() => void exams.fetchNextPage()}
                  >
                    {exams.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-sm text-[var(--muted)]">No guest exams yet.</p>
          )}
        </AdminFormPanel>
      </AdminSection>
    </AdminPage>
  );
}
