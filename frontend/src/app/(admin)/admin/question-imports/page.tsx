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
import {
  type ImportStats,
  type UploadBatch,
  statusTone,
} from '@/features/admin/question-imports/types';
import { ApiError, apiFetch, apiFetchResult } from '@/lib/api/client';
import { adminDownloadUrl } from '@/lib/api/upload';
import { EXAM_TRACKS } from '@/lib/exam-tags';
import type { CategoryNode } from '@/lib/api/types';
import { AdminBulkUploadTableSkeleton, StatCardSkeleton } from '@/components/skeletons';
import {
  AdminListMeta,
  AdminPage,
  AdminSection,
  AdminStatGrid,
  AdminToolbar,
} from '@/components/admin/admin-page';
import { AdminRowActions } from '@/components/admin/admin-row-actions';
import {
  AdminEmptyRow,
  AdminTable,
  AdminTableShell,
  AdminTd,
  AdminTh,
} from '@/components/admin/admin-table';

const menuLinkClass =
  'flex w-full items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--bg-muted)]';

export default function QuestionImportsHubPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [subject, setSubject] = useState('');
  const [examCategory, setExamCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('createdAt_desc');

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
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/question-imports/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-question-import-stats'] });
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
        <AdminStatGrid className="xl:grid-cols-3 2xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </AdminStatGrid>
      ) : stats.isError ? (
        <Alert variant="danger">Could not load upload statistics.</Alert>
      ) : s ? (
        <AdminStatGrid className="xl:grid-cols-3 2xl:grid-cols-6">
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
        </AdminStatGrid>
      ) : null}

      {s && s.recentUploads.length > 0 ? (
        <AdminSection
          title="Recent uploads"
          description="Latest batches — open one to review rows or publish."
          actions={
            <Link
              href="/admin/question-imports/new"
              className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
            >
              Start another →
            </Link>
          }
        >
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {s.recentUploads.map((item) => (
              <Link
                key={item.id}
                href={`/admin/question-imports/${item.id}`}
                className="admin-list-card min-w-0 max-w-full rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--highlight)]/40"
              >
                <div className="mb-1 flex min-w-0 items-center gap-2">
                  <Badge variant={statusTone(item.status)} className="shrink-0">
                    {item.status}
                  </Badge>
                  <span className="min-w-0 truncate font-mono text-xs text-[var(--muted-strong)]">
                    {item.batchCode}
                  </span>
                </div>
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  {item.displayName}
                </p>
                <p className="mt-1 truncate text-sm text-[var(--muted-strong)]">
                  {item.importedCount}/{item.totalRows} imported ·{' '}
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        </AdminSection>
      ) : null}

      <AdminSection
        title="Question collections"
        description="Search, filter, and manage every uploaded batch."
      >
        <AdminToolbar>
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
        </AdminToolbar>

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
          <AdminTableShell
            minWidth="48rem"
            header={
              <AdminListMeta count={items.length} noun="collection" hasMore={list.hasNextPage} />
            }
            footer={
              list.hasNextPage ? (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    disabled={list.isFetchingNextPage}
                    onClick={() => void list.fetchNextPage()}
                  >
                    {list.isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </div>
              ) : undefined
            }
          >
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh>Collection</AdminTh>
                  <AdminTh>Subject / Exam</AdminTh>
                  <AdminTh>Counts</AdminTh>
                  <AdminTh>Uploaded</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh align="right">Actions</AdminTh>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <AdminEmptyRow colSpan={6}>No collections match.</AdminEmptyRow>
                ) : (
                  items.map((item) => (
                    <tr key={item.id}>
                      <AdminTd className="max-w-[16rem] align-top">
                        <Link
                          href={`/admin/question-imports/${item.id}`}
                          className="font-semibold text-[var(--ink)] hover:text-[var(--highlight)]"
                        >
                          {item.displayName}
                        </Link>
                        <p className="mt-0.5 font-mono text-xs text-[var(--muted-strong)]">
                          {item.batchCode}
                        </p>
                        <p className="truncate text-xs text-[var(--muted-strong)]">
                          {item.originalFilename}
                        </p>
                      </AdminTd>
                      <AdminTd className="align-top text-[var(--ink-soft)]">
                        <p className="font-medium">{item.subjectHint ?? '—'}</p>
                        <p className="text-xs text-[var(--muted-strong)]">
                          {item.examCategoryHint ?? '—'}
                        </p>
                      </AdminTd>
                      <AdminTd className="align-top tabular-nums text-[var(--ink-soft)]">
                        <p className="font-medium">{item.totalRows} total</p>
                        <p className="text-xs text-[var(--muted-strong)]">
                          {item.importedCount} in · {item.duplicateCount} dup · {item.invalidCount}{' '}
                          bad
                        </p>
                      </AdminTd>
                      <AdminTd className="align-top text-[var(--ink-soft)]">
                        <p className="text-xs font-medium whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                        <p className="text-xs text-[var(--muted-strong)]">{item.uploadedBy.name}</p>
                      </AdminTd>
                      <AdminTd className="align-top">
                        <Badge variant={statusTone(item.status)}>{item.status}</Badge>
                      </AdminTd>
                      <AdminTd align="right" className="align-top">
                        <AdminRowActions
                          primary={
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
                          }
                        >
                          <a
                            className={menuLinkClass}
                            href={adminDownloadUrl(`/admin/question-imports/${item.id}/file`)}
                          >
                            <Download className="size-3.5" />
                            Original file
                          </a>
                          <a
                            className={menuLinkClass}
                            href={adminDownloadUrl(`/admin/question-imports/${item.id}/report`)}
                          >
                            <FileSpreadsheet className="size-3.5" />
                            Import report
                          </a>
                          {item.status === 'COMPLETED' ? (
                            <a
                              className={menuLinkClass}
                              href={adminDownloadUrl(`/admin/question-imports/${item.id}/export`)}
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
                        </AdminRowActions>
                      </AdminTd>
                    </tr>
                  ))
                )}
              </tbody>
            </AdminTable>
          </AdminTableShell>
        ) : null}
      </AdminSection>
    </AdminPage>
  );
}
