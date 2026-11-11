'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { apiFetch, apiFetchResult } from '@/lib/api/client';
import type { AdminQuestionListItem } from '@/lib/api/admin-types';

export default function AdminQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-56" />
          <Skeleton className="h-40 w-full" />
        </div>
      }
    >
      <AdminQuestionsContent />
    </Suspense>
  );
}

function AdminQuestionsContent() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') ?? '';
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setStatus(searchParams.get('status') ?? '');
  }, [searchParams]);

  const list = useQuery({
    queryKey: ['admin-questions', status],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '50' });
      if (status) qs.set('status', status);
      return apiFetchResult<AdminQuestionListItem[]>(`/admin/questions?${qs}`);
    },
  });

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

  const items = list.data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Questions"
        description="Create drafts, publish, edit, and archive MCQs."
        actions={
          <Link href="/admin/questions/new">
            <Button className="rounded-full px-5">New question</Button>
          </Link>
        }
      />

      <Surface className="flex flex-wrap items-center gap-3 p-4">
        <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="status">
          Filter status
        </label>
        <Select
          id="status"
          className="h-10 w-auto min-w-[10rem]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
        <p className="text-xs text-[var(--muted-strong)] sm:ml-auto">
          Showing up to 50 results{status ? ` · ${status}` : ''}
        </p>
      </Surface>

      {list.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : null}

      {!list.isLoading && items.length === 0 ? (
        <EmptyState
          title="No questions"
          description="Create your first MCQ to populate the bank."
          action={
            <Link href="/admin/questions/new">
              <Button size="sm" className="rounded-full">
                New question
              </Button>
            </Link>
          }
        />
      ) : null}

      {items.length > 0 ? (
        <Surface className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="bg-[var(--bg-desk)] text-xs font-semibold tracking-[0.08em] text-[var(--muted-strong)] uppercase">
                <tr>
                  <th className="px-5 py-3 font-semibold">Question</th>
                  <th className="px-3 py-3 font-semibold">Category</th>
                  <th className="px-3 py-3 font-semibold">Difficulty</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {items.map((q) => (
                  <tr key={q.id} className="hover:bg-[var(--brand-wash)]">
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/questions/${q.id}`}
                        className="font-semibold text-[var(--ink)] hover:underline"
                      >
                        {q.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3.5 text-[var(--muted-strong)]">
                      {q.category.name}
                      {q.subcategory ? ` · ${q.subcategory.name}` : ''}
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge variant="outline">{q.difficulty}</Badge>
                    </td>
                    <td className="px-3 py-3.5">
                      <Badge
                        variant={
                          q.status === 'PUBLISHED'
                            ? 'success'
                            : q.status === 'ARCHIVED'
                              ? 'outline'
                              : 'highlight'
                        }
                      >
                        {q.status}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Link href={`/admin/questions/${q.id}`}>
                          <Button size="sm" variant="outline" className="rounded-full">
                            Edit
                          </Button>
                        </Link>
                        {q.status !== 'PUBLISHED' ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="rounded-full"
                            disabled={publish.isPending}
                            onClick={() => publish.mutate(q.id)}
                          >
                            Publish
                          </Button>
                        ) : null}
                        {q.status !== 'ARCHIVED' ? (
                          <ConfirmButton
                            size="sm"
                            variant="ghost"
                            className="rounded-full"
                            confirmMessage="Archive this question? It will leave the learner bank."
                            onConfirm={() => archive.mutateAsync(q.id)}
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
      ) : null}
    </div>
  );
}
