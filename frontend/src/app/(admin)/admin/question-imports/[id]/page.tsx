'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch, apiFetchResult } from '@/lib/api/client';
import { adminDownloadUrl } from '@/lib/api/upload';

type BatchDetail = {
  id: string;
  batchCode: string;
  displayName: string;
  originalFilename: string;
  status: string;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  importedCount: number;
  skippedCount: number;
  failedCount: number;
  subjectHint?: string | null;
  examCategoryHint?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  importedAt?: string | null;
  uploadedBy: { id: string; name: string };
  duplicateFileBatch?: { id: string; batchCode: string; displayName: string } | null;
};

type ImportRow = {
  id: string;
  rowNumber: number;
  status: string;
  questionText: string;
  subjectName?: string | null;
  topicName?: string | null;
  errorMessage?: string | null;
};

export default function QuestionImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [rowStatus, setRowStatus] = useState('');

  const batch = useQuery({
    queryKey: ['admin-question-import', id],
    queryFn: () => apiFetch<BatchDetail>(`/admin/question-imports/${id}`),
  });

  const rows = useQuery({
    queryKey: ['admin-question-import-rows', id, rowStatus],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '100' });
      if (rowStatus) qs.set('status', rowStatus);
      return apiFetchResult<ImportRow[]>(`/admin/question-imports/${id}/rows?${qs}`);
    },
  });

  const confirm = useMutation({
    mutationFn: () =>
      apiFetch<BatchDetail>(`/admin/question-imports/${id}/confirm`, {
        method: 'POST',
        body: JSON.stringify({ skipDuplicates: true }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-question-import', id] });
      void qc.invalidateQueries({ queryKey: ['admin-question-import-rows', id] });
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
    },
  });

  const archive = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/question-imports/${id}/archive`, { method: 'PATCH' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-question-import', id] });
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
    },
  });

  if (batch.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (batch.isError || !batch.data) {
    return (
      <EmptyState
        title="Batch not found"
        description="This upload may have been deleted."
        action={
          <Link href="/admin/question-imports" className="text-sm font-semibold text-[var(--highlight)]">
            Back to uploads
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
        description={`${data.originalFilename} · uploaded by ${data.uploadedBy.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={adminDownloadUrl(`/admin/question-imports/${id}/file`)}>
              <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                Original file
              </Button>
            </a>
            <a href={adminDownloadUrl(`/admin/question-imports/${id}/report`)}>
              <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                Import report
              </Button>
            </a>
            {data.status === 'COMPLETED' ? (
              <a href={adminDownloadUrl(`/admin/question-imports/${id}/export`)}>
                <Button type="button" variant="outline" size="sm" className="cursor-pointer">
                  Export questions
                </Button>
              </a>
            ) : null}
          </div>
        }
      />

      {data.duplicateFileBatch ? (
        <Alert variant="warning">
          This file hash matches a previous upload:{' '}
          <Link
            href={`/admin/question-imports/${data.duplicateFileBatch.id}`}
            className="font-semibold underline"
          >
            {data.duplicateFileBatch.batchCode}
          </Link>
          . Identical file re-imports of completed batches are blocked; review carefully.
        </Alert>
      ) : null}

      {data.errorMessage ? <Alert variant="danger">{data.errorMessage}</Alert> : null}

      <Surface className="grid gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          ['Total', data.totalRows],
          ['Valid', data.validCount],
          ['Duplicates', data.duplicateCount],
          ['Invalid', data.invalidCount],
          ['Imported', data.importedCount],
          ['Skipped', data.skippedCount],
        ].map(([label, value]) => (
          <div key={String(label)}>
            <p className="text-xs text-[var(--muted)]">{label}</p>
            <p className="font-display text-xl font-bold tabular-nums">{value}</p>
          </div>
        ))}
      </Surface>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="highlight">{data.status}</Badge>
        {data.subjectHint ? <Badge variant="outline">{data.subjectHint}</Badge> : null}
        {data.examCategoryHint ? <Badge variant="outline">{data.examCategoryHint}</Badge> : null}
        {canImport ? (
          <Button
            type="button"
            className="cursor-pointer"
            disabled={confirm.isPending || data.validCount < 1}
            onClick={() => confirm.mutate()}
          >
            {confirm.isPending
              ? 'Importing…'
              : `Import ${data.validCount} new question${data.validCount === 1 ? '' : 's'}`}
          </Button>
        ) : null}
        {data.status !== 'ARCHIVED' ? (
          <ConfirmButton
            size="sm"
            variant="outline"
            confirmMessage="Archive this batch? Imported questions stay in the bank."
            disabled={archive.isPending}
            onConfirm={() => archive.mutate()}
          >
            Archive
          </ConfirmButton>
        ) : null}
        {confirm.isError ? (
          <Alert variant="danger" className="w-full">
            {confirm.error instanceof ApiError ? confirm.error.message : 'Import failed'}
          </Alert>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-[var(--muted)]">Preview rows</p>
        <Select
          className="h-9 w-auto min-w-[10rem]"
          value={rowStatus}
          onChange={(e) => setRowStatus(e.target.value)}
        >
          <option value="">All</option>
          <option value="VALID">Valid</option>
          <option value="DUPLICATE">Duplicate</option>
          <option value="INVALID">Invalid</option>
          <option value="IMPORTED">Imported</option>
          <option value="SKIPPED">Skipped</option>
        </Select>
      </div>

      {rows.isLoading ? <Skeleton className="h-40 w-full" /> : null}

      <div className="space-y-2">
        {(rows.data?.data ?? []).map((row) => (
          <Surface key={row.id} className="p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs text-[var(--muted)]">
                  Row {row.rowNumber} · {row.subjectName ?? '—'} / {row.topicName ?? '—'}
                </p>
                <p className="mt-0.5 text-sm font-medium text-[var(--ink)] line-clamp-2">
                  {row.questionText}
                </p>
                {row.errorMessage ? (
                  <p className="mt-1 text-xs text-[var(--danger)]">{row.errorMessage}</p>
                ) : null}
              </div>
              <Badge
                variant={
                  row.status === 'VALID' || row.status === 'IMPORTED'
                    ? 'success'
                    : row.status === 'DUPLICATE' || row.status === 'SKIPPED'
                      ? 'outline'
                      : 'danger'
                }
              >
                {row.status}
              </Badge>
            </div>
          </Surface>
        ))}
      </div>

      <Link href="/admin/question-imports" className="text-sm font-semibold text-[var(--highlight)]">
        ← All uploads
      </Link>
    </div>
  );
}
