'use client';

import Link from 'next/link';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileWarning,
  FolderOpen,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { StatCard } from '@/components/dashboard/stat-card';
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
import { Surface } from '@/components/ui/surface';
import {
  type ImportStats,
  type UploadBatch,
  statusTone,
} from '@/features/admin/question-imports/types';
import { ApiError, apiFetch, apiFetchResult } from '@/lib/api/client';
import { adminDownloadUrl } from '@/lib/api/upload';
import { EXAM_TRACKS } from '@/lib/exam-tags';
import type { CategoryNode } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { AdminBulkUploadTableSkeleton, StatCardSkeleton } from '@/components/skeletons';
import { AdminPage } from '@/components/admin/admin-page';

export default function QuestionImportsHubPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [subject, setSubject] = useState('');
  const [examCategory, setExamCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('createdAt_desc');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const stats = useQuery({
    queryKey: ['admin-question-import-stats'],
    queryFn: () => apiFetch<ImportStats>('/admin/question-imports/stats'),
  });

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const filterKey = useMemo(
    () => ({ q, status, subject, examCategory, dateFrom, dateTo, sort }),
    [q, status, subject, examCategory, dateFrom, dateTo, sort],
  );

  const list = useInfiniteQuery({
    queryKey: ['admin-question-imports', filterKey],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams({ limit: '20', sort });
      if (q.trim()) qs.set('q', q.trim());
      if (status) qs.set('status', status);
      if (subject) qs.set('subject', subject);
      if (examCategory) qs.set('examCategory', examCategory);
      if (dateFrom) qs.set('dateFrom', dateFrom);
      if (dateTo) qs.set('dateTo', dateTo);
      if (pageParam) qs.set('cursor', pageParam);
      return apiFetchResult<UploadBatch[]>(`/admin/question-imports?${qs}`);
    },
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  const archive = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/question-imports/${id}/archive`, { method: 'PATCH' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-question-import-stats'] });
      setOpenMenu(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/question-imports/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-question-import-stats'] });
      setOpenMenu(null);
    },
  });

  const items = list.data?.pages.flatMap((p) => p.data) ?? [];
  const s = stats.data;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="Bulk question upload"
        description="Import MCQs from the Google Sheets template (.xlsx/.csv), validate rows, skip duplicates, and publish into the question bank."
        actions={
          <div className="flex flex-wrap gap-2">
            <a href={adminDownloadUrl('/admin/question-imports/template')}>
              <Button type="button" variant="outline" className="cursor-pointer">
                <Download className="size-4" />
                Template
              </Button>
            </a>
            <Link href="/admin/question-imports/new">
              <Button type="button" className="cursor-pointer">
                <Plus className="size-4" />
                New upload
              </Button>
            </Link>
          </div>
        }
      />

      {stats.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : stats.isError ? (
        <Alert variant="danger">Could not load upload statistics.</Alert>
      ) : s ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <StatCard label="Collections" value={s.totalCollections} icon={FolderOpen} tone="navy" />
          <StatCard
            label="Rows processed"
            value={s.totalRowsProcessed}
            icon={FileSpreadsheet}
            tone="blue"
          />
          <StatCard
            label="Imported"
            value={s.successfullyImported}
            icon={CheckCircle2}
            tone="teal"
          />
          <StatCard label="Duplicates" value={s.duplicateQuestions} icon={Copy} tone="amber" />
          <StatCard label="Failed rows" value={s.failedImports} icon={FileWarning} tone="red" />
          <StatCard
            label="Recent uploads"
            value={s.recentUploads.length}
            hint="Last 6 batches"
            icon={Search}
            tone="slate"
          />
        </div>
      ) : null}

      {s && s.recentUploads.length > 0 ? (
        <Surface className="p-4 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-display text-base font-bold text-[var(--ink)]">Recent uploads</h2>
            <Link
              href="/admin/question-imports/new"
              className="text-xs font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
            >
              Start another →
            </Link>
          </div>
          <div className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {s.recentUploads.map((item) => (
              <Link
                key={item.id}
                href={`/admin/question-imports/${item.id}`}
                className="min-w-0 max-w-full rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] p-3 transition-colors hover:border-[var(--highlight)]/40 hover:bg-white"
              >
                <div className="mb-1 flex min-w-0 items-center gap-2">
                  <Badge variant={statusTone(item.status)} className="shrink-0">
                    {item.status}
                  </Badge>
                  <span className="min-w-0 truncate font-mono text-xs text-[var(--muted-strong)]">
                    {item.batchCode}
                  </span>
                </div>
                <p className="truncate text-sm font-semibold text-[var(--ink)]">{item.displayName}</p>
                <p className="mt-1 truncate text-sm text-[var(--muted-strong)]">
                  {item.importedCount}/{item.totalRows} imported ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </Surface>
      ) : null}

      <Surface className="min-w-0 space-y-4 overflow-hidden p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-[var(--ink)]">
              Question collections
            </h2>
            <p className="text-sm text-[var(--muted-strong)]">
              Search, filter, and manage every uploaded batch.
            </p>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <Field className="min-w-0 sm:col-span-2 xl:col-span-2">
            <Label htmlFor="qi-q">Search</Label>
            <Input
              id="qi-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Collection name or batch code"
            />
          </Field>
          <Field className="min-w-0">
            <Label htmlFor="qi-status">Status</Label>
            <Select id="qi-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>
              <option value="VALIDATED">Validated</option>
              <option value="IMPORTING">Importing</option>
              <option value="COMPLETED">Completed</option>
              <option value="FAILED">Failed</option>
              <option value="ARCHIVED">Archived</option>
            </Select>
          </Field>
          <Field className="min-w-0">
            <Label htmlFor="qi-subject">Subject</Label>
            <Select id="qi-subject" value={subject} onChange={(e) => setSubject(e.target.value)}>
              <option value="">All</option>
              {(categories.data ?? []).map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field className="min-w-0">
            <Label htmlFor="qi-exam">Exam</Label>
            <Select
              id="qi-exam"
              value={examCategory}
              onChange={(e) => setExamCategory(e.target.value)}
            >
              <option value="">All</option>
              {EXAM_TRACKS.map((t) => (
                <option key={t.tag} value={t.label}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field className="min-w-0">
            <Label htmlFor="qi-sort">Sort</Label>
            <Select id="qi-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="createdAt_desc">Newest first</option>
              <option value="createdAt_asc">Oldest first</option>
              <option value="importedCount_desc">Most imported</option>
              <option value="totalRows_desc">Most rows</option>
            </Select>
          </Field>
          <Field className="min-w-0">
            <Label htmlFor="qi-from">From</Label>
            <Input
              id="qi-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="min-w-0"
            />
          </Field>
          <Field className="min-w-0">
            <Label htmlFor="qi-to">To</Label>
            <Input
              id="qi-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="min-w-0"
            />
          </Field>
        </div>

        {list.isLoading ? <AdminBulkUploadTableSkeleton /> : null}

        {list.isError ? (
          <Alert variant="danger">
            {list.error instanceof ApiError ? list.error.message : 'Could not load collections.'}
          </Alert>
        ) : null}

        {!list.isLoading && !list.isError && items.length === 0 ? (
          <EmptyState
            title="No collections yet"
            description="Download the template, then start a new upload to validate and import questions."
            action={
              <Link href="/admin/question-imports/new">
                <Button className="cursor-pointer">
                  <Plus className="size-4" />
                  New upload
                </Button>
              </Link>
            }
          />
        ) : null}

        {items.length > 0 ? (
          <div className="min-w-0 w-full max-w-full overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-[var(--bg-desk)] text-xs tracking-wide text-[var(--muted-strong)] uppercase">
                <tr>
                  <th className="px-3 py-3 font-semibold">Collection</th>
                  <th className="px-3 py-3 font-semibold">Subject / Exam</th>
                  <th className="px-3 py-3 font-semibold">Counts</th>
                  <th className="px-3 py-3 font-semibold">Uploaded</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-[var(--line)] bg-white">
                    <td className="px-3 py-3 align-top">
                      <Link
                        href={`/admin/question-imports/${item.id}`}
                        className="font-semibold text-[var(--ink)] hover:text-[var(--highlight)]"
                      >
                        {item.displayName}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-[var(--muted-strong)]">
                        {item.batchCode}
                      </p>
                      <p className="truncate text-sm text-[var(--muted-strong)]">
                        {item.originalFilename}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top text-sm text-[var(--ink-soft)]">
                      <p className="font-medium">{item.subjectHint ?? '—'}</p>
                      <p className="text-sm text-[var(--muted-strong)]">
                        {item.examCategoryHint ?? '—'}
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top text-sm tabular-nums text-[var(--ink-soft)]">
                      <p className="font-medium">{item.totalRows} total</p>
                      <p className="text-sm text-[var(--muted-strong)]">
                        {item.importedCount} in · {item.duplicateCount} dup · {item.invalidCount}{' '}
                        bad
                      </p>
                    </td>
                    <td className="px-3 py-3 align-top text-sm text-[var(--ink-soft)]">
                      <p className="font-medium">{new Date(item.createdAt).toLocaleString()}</p>
                      <p className="text-sm text-[var(--muted-strong)]">{item.uploadedBy.name}</p>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <Badge variant={statusTone(item.status)}>{item.status}</Badge>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <div className="relative flex items-center gap-1">
                        <Link href={`/admin/question-imports/${item.id}`}>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                          >
                            <Eye className="size-3.5" />
                            View
                          </Button>
                        </Link>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="cursor-pointer"
                          aria-label="More actions"
                          onClick={() =>
                            setOpenMenu((cur) => (cur === item.id ? null : item.id))
                          }
                        >
                          <MoreHorizontal className="size-4" />
                        </Button>
                        {openMenu === item.id ? (
                          <div className="absolute top-9 right-0 z-20 w-52 rounded-[12px] border border-[var(--line)] bg-white p-1 shadow-[var(--shadow)]">
                            <a
                              className={cn(
                                'flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm hover:bg-[var(--bg-muted)]',
                              )}
                              href={adminDownloadUrl(`/admin/question-imports/${item.id}/file`)}
                            >
                              <Download className="size-3.5" />
                              Original file
                            </a>
                            <a
                              className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm hover:bg-[var(--bg-muted)]"
                              href={adminDownloadUrl(`/admin/question-imports/${item.id}/report`)}
                            >
                              <FileSpreadsheet className="size-3.5" />
                              Import report
                            </a>
                            {item.status === 'COMPLETED' ? (
                              <a
                                className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-sm hover:bg-[var(--bg-muted)]"
                                href={adminDownloadUrl(
                                  `/admin/question-imports/${item.id}/export`,
                                )}
                              >
                                <Download className="size-3.5" />
                                Export questions
                              </a>
                            ) : null}
                            {item.status !== 'ARCHIVED' ? (
                              <ConfirmButton
                                size="sm"
                                variant="ghost"
                                className="w-full justify-start gap-2"
                                confirmTitle="Archive collection?"
                                confirmMessage={`Archive “${item.displayName}”? You can still view it later under archived status.`}
                                confirmLabel="Archive"
                                reversible
                                onConfirm={() => archive.mutateAsync(item.id)}
                              >
                                <Archive className="size-3.5" />
                                Archive
                              </ConfirmButton>
                            ) : null}
                            {item.status !== 'COMPLETED' && item.status !== 'IMPORTING' ? (
                              <ConfirmButton
                                size="sm"
                                variant="ghost"
                                className="w-full justify-start gap-2 text-[var(--danger)]"
                                confirmMessage="Delete this collection? This cannot be undone."
                                onConfirm={() => remove.mutateAsync(item.id)}
                              >
                                <Trash2 className="size-3.5" />
                                Delete
                              </ConfirmButton>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {list.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={list.isFetchingNextPage}
            onClick={() => void list.fetchNextPage()}
          >
            {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </Button>
        ) : null}
      </Surface>
    </AdminPage>
  );
}
