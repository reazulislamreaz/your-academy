'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  Copy,
  Download,
  Eye,
  FileSpreadsheet,
  FileWarning,
  FolderOpen,
  Plus,
  Search,
} from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { AdminMobileCard, AdminMobileCards } from '@/components/admin/admin-mobile-cards';
import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { statusTone } from '@/features/admin/question-imports/types';
import { ApiError, apiFetch } from '@/lib/api/client';
import {
  getAdminTopicImportStats,
  listAdminTopicImports,
  type TopicUploadBatchSummary,
} from '@/lib/api/topic-questions';
import { adminDownloadUrl } from '@/lib/api/upload';
import type { CategoryNode } from '@/lib/api/types';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { AdminBulkUploadTableSkeleton, StatCardSkeleton } from '@/components/skeletons';

export default function TopicQuestionImportsHubPage() {
  const [q, setQ] = useState('');
  const debouncedQ = useDebouncedValue(q.trim(), 350);
  const [status, setStatus] = useState('');
  const [topicCategory, setTopicCategory] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('createdAt_desc');

  const stats = useQuery({
    queryKey: ['admin-topic-import-stats'],
    queryFn: getAdminTopicImportStats,
  });

  const categories = useQuery({
    queryKey: ['categories', 'TOPIC'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories?scope=TOPIC'),
  });

  const batches = useQuery({
    queryKey: ['admin-topic-imports'],
    queryFn: listAdminTopicImports,
  });

  const filtered = useMemo(() => {
    let rows = [...(batches.data ?? [])];
    const needle = debouncedQ.toLocaleLowerCase('bn');
    if (needle) {
      rows = rows.filter(
        (b) =>
          b.displayName.toLocaleLowerCase('bn').includes(needle) ||
          b.batchCode.toLocaleLowerCase('bn').includes(needle) ||
          (b.originalFilename ?? '').toLocaleLowerCase('bn').includes(needle) ||
          b.category.name.toLocaleLowerCase('bn').includes(needle) ||
          b.subcategory.name.toLocaleLowerCase('bn').includes(needle),
      );
    }
    if (status) {
      rows = rows.filter((b) => b.status === status);
    }
    if (topicCategory) {
      rows = rows.filter((b) => b.category.name === topicCategory);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      rows = rows.filter((b) => new Date(b.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      rows = rows.filter((b) => new Date(b.createdAt) <= to);
    }
    rows.sort((a, b) => {
      if (sort === 'createdAt_asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sort === 'importedCount_desc') {
        return b.importedCount - a.importedCount;
      }
      if (sort === 'totalRows_desc') {
        return b.totalRows - a.totalRows;
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    return rows;
  }, [batches.data, debouncedQ, status, topicCategory, dateFrom, dateTo, sort]);

  const renderActions = (item: TopicUploadBatchSummary, align: 'left' | 'right' = 'right') => (
    <AdminRowActions
      align={align}
      primary={
        <Link href={`/topic-base/${item.subcategory.id}`}>
          <Button type="button" size="sm" variant="outline" className="cursor-pointer">
            <Eye className="size-3.5" />
            View
          </Button>
        </Link>
      }
    />
  );

  const s = stats.data;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="Topic Base Question Analysis"
        description="Import topic questions from the 8-column Excel template (.xlsx), then publish sets into Topic Base Question Analysis — fully separate from Preliminary and Written banks."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/categories">
              <Button type="button" variant="outline" className="cursor-pointer">
                Topics taxonomy
              </Button>
            </Link>
            <a href={adminDownloadUrl('/admin/topic-question-imports/template')}>
              <Button type="button" variant="outline" className="cursor-pointer">
                <Download className="size-4" />
                Template
              </Button>
            </a>
            <Link href="/admin/topic-question-imports/new">
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
          description="Latest batches — open one to review the topic page."
          actions={
            <Link
              href="/admin/topic-question-imports/new"
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
                href={`/topic-base/${item.subcategory.id}`}
                className="admin-list-card min-w-0 max-w-full rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3.5 sm:p-4 shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--highlight)]/40"
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
        title="Topic collections"
        description="Search, filter, and manage every Topic Base upload batch."
      >
        <AdminToolbar>
          <div className="grid min-w-0 grid-cols-1 gap-3 min-[420px]:grid-cols-2 xl:grid-cols-6">
            <Field className="min-w-0 min-[420px]:col-span-2 xl:col-span-2">
              <Label htmlFor="tb-q">Search</Label>
              <SearchField
                id="tb-q"
                value={q}
                onChange={setQ}
                placeholder="Collection name or batch code"
                aria-label="Search collections by name or batch code"
              />
            </Field>
            <Field className="min-w-0">
              <Label htmlFor="tb-status">Status</Label>
              <Select id="tb-status" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="">All</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed</option>
                <option value="ARCHIVED">Archived</option>
              </Select>
            </Field>
            <Field className="min-w-0">
              <Label htmlFor="tb-topic">Topic</Label>
              <Select
                id="tb-topic"
                value={topicCategory}
                onChange={(e) => setTopicCategory(e.target.value)}
              >
                <option value="">All</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field className="min-w-0">
              <Label htmlFor="tb-sort">Sort</Label>
              <Select id="tb-sort" value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="createdAt_desc">Newest first</option>
                <option value="createdAt_asc">Oldest first</option>
                <option value="importedCount_desc">Most imported</option>
                <option value="totalRows_desc">Most rows</option>
              </Select>
            </Field>
            <Field className="min-w-0">
              <Label htmlFor="tb-from">From</Label>
              <Input
                id="tb-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="min-w-0"
              />
            </Field>
            <Field className="min-w-0">
              <Label htmlFor="tb-to">To</Label>
              <Input
                id="tb-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="min-w-0"
              />
            </Field>
          </div>
        </AdminToolbar>

        {batches.isLoading ? <AdminBulkUploadTableSkeleton /> : null}

        {batches.isError ? (
          <Alert variant="danger">
            {batches.error instanceof ApiError
              ? batches.error.message
              : 'Could not load collections.'}
          </Alert>
        ) : null}

        {!batches.isLoading && !batches.isError && filtered.length === 0 ? (
          <EmptyState
            title={(batches.data ?? []).length === 0 ? 'No collections yet' : 'No matching collections'}
            description={
              (batches.data ?? []).length === 0
                ? 'Download the template, then start a new upload to import topic questions.'
                : 'Try clearing search or filters.'
            }
            action={
              (batches.data ?? []).length === 0 ? (
                <Link href="/admin/topic-question-imports/new">
                  <Button className="cursor-pointer">
                    <Plus className="size-4" />
                    New upload
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : null}

        {filtered.length > 0 ? (
          <>
            <AdminListMeta count={filtered.length} noun="collection" className="md:hidden" />
            <AdminMobileCards>
              {filtered.map((item) => (
                <AdminMobileCard
                  key={`m-${item.id}`}
                  badges={<Badge variant={statusTone(item.status)}>{item.status}</Badge>}
                  title={
                    <Link
                      href={`/topic-base/${item.subcategory.id}`}
                      className="hover:text-[var(--highlight)]"
                    >
                      {item.displayName}
                    </Link>
                  }
                  meta={
                    <>
                      <span className="font-mono">{item.batchCode}</span>
                      <br />
                      {item.category.name} · {item.subcategory.name}
                      <br />
                      {item.totalRows} total · {item.importedCount} imported
                      <br />
                      {new Date(item.createdAt).toLocaleDateString()}
                      {item.uploadedBy?.name ? ` · ${item.uploadedBy.name}` : null}
                    </>
                  }
                  actions={renderActions(item, 'left')}
                />
              ))}
            </AdminMobileCards>
            <AdminTableShell
              desktopOnly
              minWidth="48rem"
              header={<AdminListMeta count={filtered.length} noun="collection" />}
            >
              <AdminTable>
                <thead>
                  <tr>
                    <AdminTh>Collection</AdminTh>
                    <AdminTh>Topic</AdminTh>
                    <AdminTh>Counts</AdminTh>
                    <AdminTh>Uploaded</AdminTh>
                    <AdminTh>Status</AdminTh>
                    <AdminTh align="right">Actions</AdminTh>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <AdminEmptyRow colSpan={6}>No collections match.</AdminEmptyRow>
                  ) : (
                    filtered.map((item) => (
                      <tr key={item.id}>
                        <AdminTd className="max-w-[16rem] align-top">
                          <Link
                            href={`/topic-base/${item.subcategory.id}`}
                            className="font-semibold text-[var(--ink)] hover:text-[var(--highlight)]"
                          >
                            {item.displayName}
                          </Link>
                          <p className="mt-0.5 font-mono text-xs text-[var(--muted-strong)]">
                            {item.batchCode}
                          </p>
                          {item.originalFilename ? (
                            <p className="truncate text-xs text-[var(--muted-strong)]">
                              {item.originalFilename}
                            </p>
                          ) : null}
                        </AdminTd>
                        <AdminTd className="align-top text-[var(--ink-soft)]">
                          <p className="font-medium">{item.category.name}</p>
                          <p className="text-xs text-[var(--muted-strong)]">
                            {item.subcategory.name}
                          </p>
                        </AdminTd>
                        <AdminTd className="align-top tabular-nums text-[var(--ink-soft)]">
                          <p className="font-medium">{item.totalRows} total</p>
                          <p className="text-xs text-[var(--muted-strong)]">
                            {item.importedCount} imported
                          </p>
                        </AdminTd>
                        <AdminTd className="align-top text-[var(--ink-soft)]">
                          <p className="text-xs font-medium whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                          {item.uploadedBy?.name ? (
                            <p className="text-xs text-[var(--muted-strong)]">
                              {item.uploadedBy.name}
                            </p>
                          ) : null}
                        </AdminTd>
                        <AdminTd className="align-top">
                          <Badge variant={statusTone(item.status)}>{item.status}</Badge>
                        </AdminTd>
                        <AdminTd align="right" className="align-top">
                          {renderActions(item)}
                        </AdminTd>
                      </tr>
                    ))
                  )}
                </tbody>
              </AdminTable>
            </AdminTableShell>
          </>
        ) : null}
      </AdminSection>
    </AdminPage>
  );
}
