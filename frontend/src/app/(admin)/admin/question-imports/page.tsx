'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetchResult } from '@/lib/api/client';
import { adminDownloadUrl, apiUploadForm } from '@/lib/api/upload';

type UploadBatch = {
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
  subjectHint?: string | null;
  examCategoryHint?: string | null;
  createdAt: string;
  uploadedBy: { id: string; name: string };
  duplicateFileBatchId?: string | null;
};

export default function QuestionImportsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [batchCode, setBatchCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['admin-question-imports', status, q],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '50' });
      if (status) qs.set('status', status);
      if (q.trim()) qs.set('q', q.trim());
      return apiFetchResult<UploadBatch[]>(`/admin/question-imports?${qs}`);
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new ApiError('FILE_REQUIRED', 'Choose a file first', 400);
      const form = new FormData();
      form.append('file', file);
      if (batchCode.trim()) form.append('batchCode', batchCode.trim());
      if (displayName.trim()) form.append('displayName', displayName.trim());
      return apiUploadForm<UploadBatch>('/admin/question-imports/upload', form);
    },
    onSuccess: (result) => {
      setUploadError(null);
      setFile(null);
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
      window.location.href = `/admin/question-imports/${result.data.id}`;
    },
    onError: (err) => {
      setUploadError(err instanceof ApiError ? err.message : 'Upload failed');
    },
  });

  const items = list.data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Bulk question upload"
        description="Import MCQs from Excel/CSV with batch identity, validation preview, and duplicate detection."
        actions={
          <a href={adminDownloadUrl('/admin/question-imports/template')} className="inline-flex">
            <Button type="button" variant="outline" className="cursor-pointer rounded-full">
              Download template
            </Button>
          </a>
        }
      />

      <Surface className="space-y-4 p-4 sm:p-5">
        <h2 className="font-display text-base font-bold">Upload a collection</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <Label htmlFor="batch-code">Batch code (optional)</Label>
            <Input
              id="batch-code"
              value={batchCode}
              onChange={(e) => setBatchCode(e.target.value)}
              placeholder="BCS_PRELIMINARY_2025_SET_01"
            />
          </Field>
          <Field>
            <Label htmlFor="display-name">Display name (optional)</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="BCS Preliminary 2025 Set 01"
            />
          </Field>
          <Field className="sm:col-span-2">
            <Label htmlFor="file">Excel or CSV file</Label>
            <Input
              id="file"
              type="file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
        </div>
        {uploadError ? <Alert variant="danger">{uploadError}</Alert> : null}
        <Button
          type="button"
          className="cursor-pointer"
          disabled={!file || upload.isPending}
          onClick={() => upload.mutate()}
        >
          {upload.isPending ? 'Validating…' : 'Upload & validate'}
        </Button>
      </Surface>

      <Surface className="flex flex-wrap items-end gap-3 p-4">
        <Field>
          <Label htmlFor="filter-status">Status</Label>
          <Select
            id="filter-status"
            className="h-10 min-w-[10rem]"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="">All</option>
            <option value="VALIDATED">Validated</option>
            <option value="IMPORTING">Importing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </Field>
        <Field className="min-w-[14rem] flex-1">
          <Label htmlFor="filter-q">Search</Label>
          <Input
            id="filter-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Batch code or file name"
          />
        </Field>
      </Surface>

      {list.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {!list.isLoading && items.length === 0 ? (
        <EmptyState
          title="No uploads yet"
          description="Download the template, fill rows, then upload to preview and import."
        />
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <Surface key={item.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="highlight">{item.status}</Badge>
                  {item.subjectHint ? <Badge variant="outline">{item.subjectHint}</Badge> : null}
                  {item.examCategoryHint ? (
                    <Badge variant="outline">{item.examCategoryHint}</Badge>
                  ) : null}
                </div>
                <h3 className="font-display text-base font-semibold">
                  <Link
                    href={`/admin/question-imports/${item.id}`}
                    className="hover:text-[var(--highlight)]"
                  >
                    {item.displayName}
                  </Link>
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {item.batchCode} · {item.originalFilename} · by {item.uploadedBy.name} ·{' '}
                  {new Date(item.createdAt).toLocaleString()}
                </p>
                <p className="text-xs text-[var(--muted-strong)]">
                  {item.totalRows} rows · {item.validCount} valid · {item.duplicateCount} duplicate ·{' '}
                  {item.invalidCount} invalid · {item.importedCount} imported
                </p>
              </div>
              <Link href={`/admin/question-imports/${item.id}`}>
                <Button type="button" size="sm" variant="outline" className="cursor-pointer">
                  Open
                </Button>
              </Link>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
