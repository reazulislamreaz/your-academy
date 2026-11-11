'use client';

import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  Download,
  FileSpreadsheet,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { BulkQuestionPreviewSkeleton, BulkUploadDetailSkeleton } from '@/components/skeletons';
import { Surface } from '@/components/ui/surface';
import {
  type ImportRow,
  type UploadBatch,
  statusTone,
} from '@/features/admin/question-imports/types';
import { ApiError, apiFetch, apiFetchResult } from '@/lib/api/client';
import { adminDownloadUrl } from '@/lib/api/upload';
import { EXAM_TRACKS } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';

function QuestionImportDetailContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [rowStatus, setRowStatus] = useState('');
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [subjectHint, setSubjectHint] = useState('');
  const [topicHint, setTopicHint] = useState('');
  const [examCategoryHint, setExamCategoryHint] = useState('');
  const [importProgress, setImportProgress] = useState<number | null>(null);

  const batch = useQuery({
    queryKey: ['admin-question-import', id],
    queryFn: () => apiFetch<UploadBatch>(`/admin/question-imports/${id}`),
  });

  useEffect(() => {
    if (!batch.data) return;
    setDisplayName(batch.data.displayName);
    setDescription(batch.data.description ?? '');
    setSubjectHint(batch.data.subjectHint ?? '');
    setTopicHint(batch.data.topicHint ?? '');
    setExamCategoryHint(batch.data.examCategoryHint ?? '');
  }, [batch.data]);

  const rows = useInfiniteQuery({
    queryKey: ['admin-question-import-rows', id, rowStatus],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams({ limit: '50' });
      if (rowStatus) qs.set('status', rowStatus);
      if (pageParam) qs.set('cursor', pageParam);
      return apiFetchResult<ImportRow[]>(`/admin/question-imports/${id}/rows?${qs}`);
    },
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const confirm = useMutation({
    mutationFn: async () => {
      setImportProgress(20);
      const timer = window.setInterval(() => {
        setImportProgress((p) => (p == null || p >= 90 ? p : p + 8));
      }, 400);
      try {
        const result = await apiFetch<UploadBatch>(`/admin/question-imports/${id}/confirm`, {
          method: 'POST',
          body: JSON.stringify({ skipDuplicates }),
        });
        setImportProgress(100);
        return result;
      } finally {
        window.clearInterval(timer);
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-question-import', id] });
      void qc.invalidateQueries({ queryKey: ['admin-question-import-rows', id] });
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-question-import-stats'] });
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
      window.setTimeout(() => setImportProgress(null), 800);
    },
    onError: () => setImportProgress(null),
  });

  const saveMeta = useMutation({
    mutationFn: () =>
      apiFetch<UploadBatch>(`/admin/question-imports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          description,
          subjectHint,
          topicHint,
          examCategoryHint,
        }),
      }),
    onSuccess: () => {
      setEditing(false);
      void qc.invalidateQueries({ queryKey: ['admin-question-import', id] });
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
    },
  });

  const archive = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/question-imports/${id}/archive`, { method: 'PATCH' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-question-import', id] });
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-question-import-stats'] });
    },
  });

  const remove = useMutation({
    mutationFn: () => apiFetch(`/admin/question-imports/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-question-import-stats'] });
      window.location.href = '/admin/question-imports';
    },
  });

  const rowItems = rows.data?.pages.flatMap((p) => p.data) ?? [];
  const highlightPreview = searchParams.get('step') === 'preview';

  const summary = useMemo(() => {
    const data = batch.data;
    if (!data) return [];
    return [
      { label: 'Total rows', value: data.totalRows },
      { label: 'Valid', value: data.validCount, tone: 'text-[var(--success-fg)]' },
      { label: 'Duplicates', value: data.duplicateCount, tone: 'text-[var(--warning-fg)]' },
      { label: 'Invalid', value: data.invalidCount, tone: 'text-[var(--danger-fg)]' },
      { label: 'Imported', value: data.importedCount },
      { label: 'Skipped', value: data.skippedCount ?? 0 },
    ];
  }, [batch.data]);

  if (batch.isLoading) {
    return <BulkUploadDetailSkeleton />;
  }

  if (batch.isError || !batch.data) {
    return (
      <EmptyState
        title="Collection not found"
        description="This upload may have been deleted."
        action={
          <Link href="/admin/question-imports" className="text-sm font-semibold text-[var(--highlight)]">
            Back to collections
          </Link>
        }
      />
    );
  }

  const data = batch.data;
  const canImport = data.status === 'VALIDATED' || data.status === 'FAILED';

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={data.batchCode}
        title={data.displayName}
        description={`${data.originalFilename} · uploaded by ${data.uploadedBy.name} · ${new Date(data.createdAt).toLocaleString()}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={adminDownloadUrl(`/admin/question-imports/${id}/file`)}>
              <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                <Download className="size-3.5" />
                Original
              </Button>
            </a>
            <a href={adminDownloadUrl(`/admin/question-imports/${id}/report`)}>
              <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                <FileSpreadsheet className="size-3.5" />
                Report
              </Button>
            </a>
            {data.status === 'COMPLETED' ? (
              <a href={adminDownloadUrl(`/admin/question-imports/${id}/export`)}>
                <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                  Export
                </Button>
              </a>
            ) : null}
          </div>
        }
      />

      {highlightPreview && canImport ? (
        <Alert variant="info">
          File validated. Review the preview below, then import valid questions.
        </Alert>
      ) : null}

      {data.duplicateFileBatch ? (
        <Alert variant="warning">
          File hash matches a previous upload:{' '}
          <Link
            href={`/admin/question-imports/${data.duplicateFileBatch.id}`}
            className="font-semibold underline"
          >
            {data.duplicateFileBatch.batchCode}
          </Link>
          .
        </Alert>
      ) : null}

      {data.errorMessage ? <Alert variant="danger">{data.errorMessage}</Alert> : null}

      <div className="motion-stagger grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {summary.map((item) => (
          <Surface key={item.label} interactive className="p-4">
            <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
              {item.label}
            </p>
            <p
              className={cn(
                'mt-1 font-display text-2xl font-bold tabular-nums text-[var(--ink)]',
                item.tone,
              )}
            >
              {item.value}
            </p>
          </Surface>
        ))}
      </div>

      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusTone(data.status)}>{data.status}</Badge>
            {data.subjectHint ? <Badge variant="outline">{data.subjectHint}</Badge> : null}
            {data.topicHint ? <Badge variant="outline">{data.topicHint}</Badge> : null}
            {data.examCategoryHint ? (
              <Badge variant="outline">{data.examCategoryHint}</Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil className="size-3.5" />
              {editing ? 'Close editor' : 'Edit details'}
            </Button>
            {data.status !== 'ARCHIVED' ? (
              <ConfirmButton
                size="sm"
                variant="outline"
                confirmMessage="Archive this collection? Imported questions stay in the bank."
                disabled={archive.isPending}
                onConfirm={() => archive.mutate()}
              >
                <Archive className="size-3.5" />
                Archive
              </ConfirmButton>
            ) : null}
            {data.status !== 'COMPLETED' && data.status !== 'IMPORTING' ? (
              <ConfirmButton
                size="sm"
                variant="outline"
                className="text-[var(--danger)]"
                confirmMessage="Delete this collection permanently?"
                disabled={remove.isPending}
                onConfirm={() => remove.mutate()}
              >
                <Trash2 className="size-3.5" />
                Delete
              </ConfirmButton>
            ) : null}
          </div>
        </div>

        {editing ? (
          <div className="grid gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] p-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label htmlFor="edit-name">Collection name</Label>
              <Input
                id="edit-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Input
                id="edit-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="edit-subject">Subject</Label>
              <Input
                id="edit-subject"
                value={subjectHint}
                onChange={(e) => setSubjectHint(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="edit-topic">Topic</Label>
              <Input
                id="edit-topic"
                value={topicHint}
                onChange={(e) => setTopicHint(e.target.value)}
              />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="edit-exam">Exam category</Label>
              <Select
                id="edit-exam"
                value={examCategoryHint}
                onChange={(e) => setExamCategoryHint(e.target.value)}
              >
                <option value="">—</option>
                {EXAM_TRACKS.map((t) => (
                  <option key={t.tag} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <Button
                type="button"
                className="cursor-pointer"
                disabled={saveMeta.isPending || !displayName.trim()}
                onClick={() => saveMeta.mutate()}
              >
                {saveMeta.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              {saveMeta.isError ? (
                <p className="mt-2 text-sm font-medium text-[var(--danger-fg)]">
                  {saveMeta.error instanceof ApiError
                    ? saveMeta.error.message
                    : 'Could not save'}
                </p>
              ) : null}
            </div>
          </div>
        ) : data.description ? (
          <p className="text-sm text-[var(--ink-soft)]">{data.description}</p>
        ) : null}

        {canImport ? (
          <div className="rounded-[14px] border border-[var(--info)]/30 bg-[var(--info-soft)] p-4">
            <h3 className="font-display text-base font-bold text-[var(--info-fg)]">
              Import questions
            </h3>
            <p className="mt-1 text-sm leading-relaxed text-[var(--ink-soft)]">
              Import {data.validCount} valid question{data.validCount === 1 ? '' : 's'}. Duplicates
              and invalid rows are never inserted as new questions.
            </p>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="size-4 cursor-pointer accent-[var(--highlight)]"
                checked={skipDuplicates}
                onChange={(e) => setSkipDuplicates(e.target.checked)}
              />
              Skip duplicate rows (recommended)
            </label>
            {importProgress != null ? (
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-sm font-medium text-[var(--ink-soft)]">
                  <span>Importing…</span>
                  <span className="tabular-nums">{importProgress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/80">
                  <div
                    className="h-full rounded-full bg-[var(--highlight)] transition-all"
                    style={{ width: `${importProgress}%` }}
                  />
                </div>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                className="cursor-pointer"
                disabled={confirm.isPending || data.validCount < 1}
                onClick={() => confirm.mutate()}
              >
                {confirm.isPending ? 'Importing…' : 'Confirm import'}
              </Button>
            </div>
            {confirm.isError ? (
              <Alert variant="danger" className="mt-3">
                {confirm.error instanceof ApiError ? confirm.error.message : 'Import failed'}
              </Alert>
            ) : null}
            {confirm.isSuccess ? (
              <Alert variant="success" className="mt-3">
                Import finished. {confirm.data.importedCount} question
                {confirm.data.importedCount === 1 ? '' : 's'} added to the bank.
              </Alert>
            ) : null}
          </div>
        ) : null}
      </Surface>

      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold">Question preview</h2>
            <p className="text-sm text-[var(--muted-strong)]">
              Row-level validation with options and duplicate highlights.
            </p>
          </div>
          <Select
            className="h-9 w-auto min-w-[10rem]"
            value={rowStatus}
            onChange={(e) => setRowStatus(e.target.value)}
          >
            <option value="">All rows</option>
            <option value="VALID">Valid</option>
            <option value="DUPLICATE">Duplicate</option>
            <option value="INVALID">Invalid</option>
            <option value="IMPORTED">Imported</option>
            <option value="SKIPPED">Skipped</option>
          </Select>
        </div>

        {rows.isLoading ? <BulkQuestionPreviewSkeleton rows={4} /> : null}

        {!rows.isLoading && rowItems.length === 0 ? (
          <EmptyState title="No rows" description="No rows match this filter." />
        ) : null}

        <div className="overflow-x-auto rounded-[12px] border border-[var(--line)]">
          <table className="min-w-[960px] w-full text-left text-sm">
            <thead className="bg-[var(--bg-desk)] text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
              <tr>
                <th className="px-3 py-3">Row</th>
                <th className="px-3 py-3">Question</th>
                <th className="px-3 py-3">Options</th>
                <th className="px-3 py-3">Answer</th>
                <th className="px-3 py-3">Subject</th>
                <th className="px-3 py-3">Diff.</th>
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rowItems.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-t border-[var(--line)] align-top',
                    row.status === 'DUPLICATE' || row.status === 'SKIPPED'
                      ? 'bg-[var(--warning)]/5'
                      : row.status === 'INVALID'
                        ? 'bg-[var(--danger-soft)]/40'
                        : 'bg-white',
                  )}
                >
                  <td className="px-3 py-3 tabular-nums text-sm font-medium text-[var(--muted-strong)]">
                    {row.rowNumber}
                  </td>
                  <td className="px-3 py-3">
                    <p className="line-clamp-4 max-w-md text-sm leading-relaxed font-medium text-[var(--ink)]">
                      {row.questionText}
                    </p>
                    {row.errorMessage ? (
                      <p className="mt-1 text-sm font-medium text-[var(--danger-fg)]">
                        {row.errorMessage}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-sm leading-relaxed text-[var(--ink-soft)]">
                    <p>A. {row.optionA}</p>
                    <p>B. {row.optionB}</p>
                    <p>C. {row.optionC}</p>
                    <p>D. {row.optionD}</p>
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-[var(--ink)]">
                    {row.correctAnswer ?? '—'}
                  </td>
                  <td className="px-3 py-3 text-sm text-[var(--ink-soft)]">
                    <p className="font-medium">{row.subjectName ?? '—'}</p>
                    <p className="text-sm text-[var(--muted-strong)]">{row.topicName ?? '—'}</p>
                  </td>
                  <td className="px-3 py-3 text-sm font-medium text-[var(--ink-soft)]">
                    {row.difficulty ?? '—'}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={statusTone(row.status)}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={rows.isFetchingNextPage}
            onClick={() => void rows.fetchNextPage()}
          >
            {rows.isFetchingNextPage ? 'Loading…' : 'Load more rows'}
          </Button>
        ) : null}
      </Surface>

      <Link href="/admin/question-imports" className="text-sm font-semibold text-[var(--highlight)]">
        ← All collections
      </Link>
    </div>
  );
}

export default function QuestionImportDetailPage() {
  return (
    <Suspense
      fallback={<BulkUploadDetailSkeleton />}
    >
      <QuestionImportDetailContent />
    </Suspense>
  );
}
