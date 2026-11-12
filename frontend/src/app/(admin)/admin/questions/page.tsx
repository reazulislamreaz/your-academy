'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { FileUp, Plus, Search } from 'lucide-react';
import { Suspense, useEffect, useState } from 'react';
import { AdminMobileCard, AdminMobileCards } from '@/components/admin/admin-mobile-cards';
import { AdminBulkBar, AdminListMeta, AdminPage, AdminToolbar } from '@/components/admin/admin-page';
import { AdminRowActions } from '@/components/admin/admin-row-actions';
import { AdminPublishStatus } from '@/components/admin/admin-status';
import { AdminEmptyRow, AdminTable, AdminTableShell, AdminTd, AdminTh } from '@/components/admin/admin-table';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Select } from '@/components/ui/select';
import { ContentIn } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';
import type { AdminQuestionListItem } from '@/lib/api/admin-types';
import { AdminQuestionsPageSkeleton } from '@/components/skeletons';
import { useCursorList } from '@/lib/hooks/use-cursor-list';

export default function AdminQuestionsPage() {
  return (
    <Suspense fallback={<AdminQuestionsPageSkeleton />}>
      <AdminQuestionsContent />
    </Suspense>
  );
}

function AdminQuestionsContent() {
  const qc = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const initialQ = searchParams.get('q') ?? '';
  const [status, setStatus] = useState(initialStatus);
  const [q, setQ] = useState(initialQ);
  const [qDraft, setQDraft] = useState(initialQ);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  useEffect(() => {
    setStatus(searchParams.get('status') ?? '');
    const nextQ = searchParams.get('q') ?? '';
    setQ(nextQ);
    setQDraft(nextQ);
    setSelected(new Set());
  }, [searchParams]);

  const list = useCursorList<AdminQuestionListItem>(
    ['admin-questions', status, q],
    (cursor) => {
      const qs = new URLSearchParams({ limit: '30' });
      if (status) qs.set('status', status);
      if (q.trim()) qs.set('q', q.trim());
      if (cursor) qs.set('cursor', cursor);
      return `/admin/questions?${qs}`;
    },
  );

  const publish = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/questions/${id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/questions/${id}/archive`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const bulkArchive = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await apiFetch(`/admin/questions/${id}/archive`, { method: 'POST' });
      }
      return ids.length;
    },
    onSuccess: (count) => {
      setSelected(new Set());
      setBulkMsg(`Archived ${count} question${count === 1 ? '' : 's'}.`);
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
      void qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
  });

  const duplicate = useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ id: string }>(`/admin/questions/${id}/duplicate`, { method: 'POST' }),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
      router.push(`/admin/questions/${created.id}`);
    },
  });

  const items = list.items;
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(items.map((i) => i.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applySearch(nextQ: string, nextStatus: string) {
    const params = new URLSearchParams();
    if (nextStatus) params.set('status', nextStatus);
    if (nextQ.trim()) params.set('q', nextQ.trim());
    const qs = params.toString();
    router.replace(qs ? `/admin/questions?${qs}` : '/admin/questions');
  }

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Content"
        title="Questions"
        description="Search, publish, and archive MCQs. Use bulk upload for spreadsheet imports."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/question-imports/new">
              <Button variant="outline" size="sm">
                <FileUp className="size-4" aria-hidden />
                Bulk upload
              </Button>
            </Link>
            <Link href="/admin/questions/new">
              <Button size="sm">
                <Plus className="size-4" aria-hidden />
                New question
              </Button>
            </Link>
          </div>
        }
      />

      <AdminToolbar>
        <form
          className="admin-filter-grid"
          onSubmit={(e) => {
            e.preventDefault();
            applySearch(qDraft, status);
            setQ(qDraft.trim());
            setSelected(new Set());
          }}
        >
          <div className="relative min-w-0">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted-strong)]"
              aria-hidden
            />
            <Input
              value={qDraft}
              onChange={(e) => setQDraft(e.target.value)}
              placeholder="Search title, content, or source note"
              className="h-10 pl-9"
              aria-label="Search questions"
            />
          </div>
          <Select
            id="status"
            className="h-10 w-full sm:w-44"
            value={status}
            aria-label="Filter by status"
            onChange={(e) => {
              const next = e.target.value;
              setStatus(next);
              setSelected(new Set());
              applySearch(qDraft, next);
            }}
          >
            <option value="">All statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
          <Button type="submit" variant="outline" className="h-10 sm:w-auto">
            Search
          </Button>
        </form>
      </AdminToolbar>

      {bulkMsg ? <Alert variant="success">{bulkMsg}</Alert> : null}

      <AdminBulkBar count={selected.size} label="questions selected">
        <ConfirmButton
          size="sm"
          variant="danger"
          confirmTitle="Archive selected questions?"
          confirmMessage={`Archive ${selected.size} question(s)? They leave the learner bank.`}
          confirmLabel="Archive all"
          reversible
          onConfirm={() => bulkArchive.mutateAsync([...selected])}
        >
          Archive selected
        </ConfirmButton>
      </AdminBulkBar>

      {list.isLoading ? <AdminQuestionsPageSkeleton omitHeader /> : null}

      {!list.isLoading && items.length === 0 ? (
        <EmptyState
          title="No questions found"
          description={
            q || status
              ? 'Try a different search or status filter.'
              : 'Create your first MCQ or import a spreadsheet.'
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/admin/questions/new">
                <Button size="sm">New question</Button>
              </Link>
              <Link href="/admin/question-imports/new">
                <Button size="sm" variant="outline">
                  Bulk upload
                </Button>
              </Link>
            </div>
          }
        />
      ) : null}

      {!list.isLoading && items.length > 0 ? (
        <ContentIn className="space-y-4">
          <AdminListMeta
            className="md:hidden"
            count={items.length}
            noun="question"
            hasMore={list.hasNextPage}
            query={q || undefined}
          />
          <AdminMobileCards>
            {items.map((qItem) => (
              <AdminMobileCard
                key={`m-${qItem.id}`}
                selected={selected.has(qItem.id)}
                onToggleSelect={() => toggleOne(qItem.id)}
                selectLabel={`Select ${qItem.title}`}
                badges={
                  <>
                    <AdminPublishStatus status={qItem.status} />
                    <Badge variant="outline">{qItem.difficulty}</Badge>
                  </>
                }
                title={
                  <Link href={`/admin/questions/${qItem.id}`} className="hover:underline">
                    {qItem.title}
                  </Link>
                }
                meta={
                  <>
                    {qItem.category.name}
                    {qItem.subcategory ? ` · ${qItem.subcategory.name}` : ''}
                  </>
                }
                actions={
                  <>
                    <Link href={`/admin/questions/${qItem.id}`}>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </Link>
                    {qItem.status !== 'PUBLISHED' ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={publish.isPending}
                        onClick={() => publish.mutate(qItem.id)}
                      >
                        Publish
                      </Button>
                    ) : (
                      <Link href={`/questions/${qItem.id}`} target="_blank">
                        <Button size="sm" variant="ghost">
                          Preview
                        </Button>
                      </Link>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={duplicate.isPending}
                      onClick={() => duplicate.mutate(qItem.id)}
                    >
                      Duplicate
                    </Button>
                    {qItem.status !== 'ARCHIVED' ? (
                      <ConfirmButton
                        size="sm"
                        variant="ghost"
                        confirmTitle="Archive this question?"
                        confirmMessage="Archive this question? It will leave the learner bank."
                        confirmLabel="Archive"
                        reversible
                        onConfirm={() => archive.mutateAsync(qItem.id)}
                      >
                        Archive
                      </ConfirmButton>
                    ) : null}
                  </>
                }
              />
            ))}
          </AdminMobileCards>

          <AdminTableShell
            desktopOnly
            minWidth="52rem"
            header={
              <AdminListMeta
                count={items.length}
                noun="question"
                hasMore={list.hasNextPage}
                query={q || undefined}
              />
            }
            footer={
              <LoadMoreButton
                hasNextPage={list.hasNextPage}
                isFetchingNextPage={list.isFetchingNextPage}
                onLoadMore={() => void list.fetchNextPage()}
              />
            }
          >
            <AdminTable>
              <thead>
                <tr>
                  <AdminTh className="w-10">
                    <input
                      type="checkbox"
                      className="admin-checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label="Select all on page"
                    />
                  </AdminTh>
                  <AdminTh>Question</AdminTh>
                  <AdminTh>Category</AdminTh>
                  <AdminTh>Difficulty</AdminTh>
                  <AdminTh>Status</AdminTh>
                  <AdminTh align="right">Actions</AdminTh>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <AdminEmptyRow colSpan={6}>No questions match this filter.</AdminEmptyRow>
                ) : (
                  items.map((qItem) => (
                    <tr key={qItem.id}>
                      <AdminTd>
                        <input
                          type="checkbox"
                          className="admin-checkbox"
                          checked={selected.has(qItem.id)}
                          onChange={() => toggleOne(qItem.id)}
                          aria-label={`Select ${qItem.title}`}
                        />
                      </AdminTd>
                      <AdminTd>
                        <Link
                          href={`/admin/questions/${qItem.id}`}
                          className="line-clamp-2 font-semibold text-[var(--ink)] hover:underline"
                        >
                          {qItem.title}
                        </Link>
                      </AdminTd>
                      <AdminTd muted>
                        <span className="line-clamp-2">
                          {qItem.category.name}
                          {qItem.subcategory ? ` · ${qItem.subcategory.name}` : ''}
                        </span>
                      </AdminTd>
                      <AdminTd>
                        <Badge variant="outline">{qItem.difficulty}</Badge>
                      </AdminTd>
                      <AdminTd>
                        <AdminPublishStatus status={qItem.status} />
                      </AdminTd>
                      <AdminTd align="right">
                        <AdminRowActions
                          primary={
                            <>
                              <Link href={`/admin/questions/${qItem.id}`}>
                                <Button size="sm" variant="outline">
                                  Edit
                                </Button>
                              </Link>
                              {qItem.status !== 'PUBLISHED' ? (
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  disabled={publish.isPending}
                                  onClick={() => publish.mutate(qItem.id)}
                                >
                                  Publish
                                </Button>
                              ) : null}
                            </>
                          }
                        >
                          {qItem.status === 'PUBLISHED' ? (
                            <Link href={`/questions/${qItem.id}`} target="_blank">
                              <Button size="sm" variant="ghost">
                                Preview
                              </Button>
                            </Link>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={duplicate.isPending}
                            onClick={() => duplicate.mutate(qItem.id)}
                          >
                            Duplicate
                          </Button>
                          {qItem.status !== 'ARCHIVED' ? (
                            <ConfirmButton
                              size="sm"
                              variant="ghost"
                              confirmTitle="Archive this question?"
                              confirmMessage="Archive this question? It will leave the learner bank."
                              confirmLabel="Archive"
                              reversible
                              onConfirm={() => archive.mutateAsync(qItem.id)}
                            >
                              Archive
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

          <div className="md:hidden">
            <LoadMoreButton
              hasNextPage={list.hasNextPage}
              isFetchingNextPage={list.isFetchingNextPage}
              onLoadMore={() => void list.fetchNextPage()}
            />
          </div>
        </ContentIn>
      ) : null}
    </AdminPage>
  );
}
