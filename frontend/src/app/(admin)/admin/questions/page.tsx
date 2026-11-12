'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { ContentIn } from '@/components/ui/skeleton';
import { apiFetch } from '@/lib/api/client';
import type { AdminQuestionListItem } from '@/lib/api/admin-types';
import { AdminQuestionsPageSkeleton } from '@/components/skeletons';
import { useCursorList } from '@/lib/hooks/use-cursor-list';
import { AdminPage } from '@/components/admin/admin-page';

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

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="Questions"
        description="Create drafts, duplicate, publish, edit, and archive single-correct MCQs."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/question-imports/new">
              <Button variant="outline" className="px-5">
                Bulk upload
              </Button>
            </Link>
            <Link href="/admin/questions/new">
              <Button className="px-5">New question</Button>
            </Link>
          </div>
        }
      />

      <Surface className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-center">
        <form
          className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(qDraft.trim());
            setSelected(new Set());
          }}
        >
          <Input
            value={qDraft}
            onChange={(e) => setQDraft(e.target.value)}
            placeholder="Search title, content, source note"
            className="h-10 min-w-0 flex-1"
          />
          <Button type="submit" size="sm" variant="outline">
            Search
          </Button>
        </form>
        <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="status">
          Status
        </label>
        <Select
          id="status"
          className="h-10 w-auto min-w-[10rem]"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setSelected(new Set());
          }}
        >
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </Surface>

      {bulkMsg ? <Alert variant="success">{bulkMsg}</Alert> : null}

      {selected.size > 0 ? (
        <Surface className="flex flex-wrap items-center justify-between gap-3 p-3">
          <p className="text-sm text-[var(--ink-soft)]">
            <span className="font-semibold tabular-nums">{selected.size}</span> selected
          </p>
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
        </Surface>
      ) : null}

      {list.isLoading ? <AdminQuestionsPageSkeleton omitHeader /> : null}

      {!list.isLoading && items.length === 0 ? (
        <EmptyState
          title="No questions"
          description="Create your first MCQ or import a spreadsheet."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Link href="/admin/questions/new">
                <Button size="sm">
                  New question
                </Button>
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
        <ContentIn>
          <Surface className="overflow-hidden p-0">
            <div className="min-w-0 w-full max-w-full overflow-x-auto">
              <table className="w-full min-w-[48rem] text-left text-sm">
                <thead className="bg-[var(--bg-desk)] text-xs font-semibold tracking-[0.08em] text-[var(--muted-strong)] uppercase">
                  <tr>
                    <th className="px-3 py-3 sm:px-5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all on page"
                      />
                    </th>
                    <th className="px-3 py-3 font-semibold">Question</th>
                    <th className="px-3 py-3 font-semibold">Category</th>
                    <th className="px-3 py-3 font-semibold">Difficulty</th>
                    <th className="px-3 py-3 font-semibold">Status</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {items.map((qItem) => (
                    <tr key={qItem.id} className="hover:bg-[var(--brand-wash)]">
                      <td className="px-3 py-3.5 sm:px-5">
                        <input
                          type="checkbox"
                          checked={selected.has(qItem.id)}
                          onChange={() => toggleOne(qItem.id)}
                          aria-label={`Select ${qItem.title}`}
                        />
                      </td>
                      <td className="px-3 py-3.5">
                        <Link
                          href={`/admin/questions/${qItem.id}`}
                          className="font-semibold text-[var(--ink)] hover:underline"
                        >
                          {qItem.title}
                        </Link>
                      </td>
                      <td className="px-3 py-3.5 text-[var(--muted-strong)]">
                        {qItem.category.name}
                        {qItem.subcategory ? ` · ${qItem.subcategory.name}` : ''}
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge variant="outline">{qItem.difficulty}</Badge>
                      </td>
                      <td className="px-3 py-3.5">
                        <Badge
                          variant={
                            qItem.status === 'PUBLISHED'
                              ? 'success'
                              : qItem.status === 'ARCHIVED'
                                ? 'outline'
                                : 'highlight'
                          }
                        >
                          {qItem.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <Link href={`/admin/questions/${qItem.id}`}>
                            <Button size="sm" variant="outline">
                              Edit
                            </Button>
                          </Link>
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
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Surface>
          <LoadMoreButton
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
          />
        </ContentIn>
      ) : null}
    </AdminPage>
  );
}
