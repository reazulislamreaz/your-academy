'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch, apiFetchResult } from '@/lib/api/client';
import type { AdminQuestionListItem } from '@/lib/api/admin-types';

export default function AdminQuestionsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');

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
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-questions'] }),
  });

  const archive = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/questions/${id}/archive`, { method: 'POST' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-questions'] }),
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
            <Button>New question</Button>
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-[var(--muted)]" htmlFor="status">
          Status
        </label>
        <Select
          id="status"
          className="h-10 w-auto min-w-[9rem]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

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
              <Button size="sm">New question</Button>
            </Link>
          }
        />
      ) : null}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
        <ul className="divide-y divide-[var(--line)]">
          {items.map((q) => (
            <li key={q.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <Link
                  href={`/admin/questions/${q.id}`}
                  className="font-semibold hover:underline"
                >
                  {q.title}
                </Link>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {q.category.name}
                  {q.subcategory ? ` · ${q.subcategory.name}` : ''} · {q.difficulty}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
                <Link href={`/admin/questions/${q.id}`}>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </Link>
                {q.status !== 'PUBLISHED' ? (
                  <Button
                    size="sm"
                    variant="secondary"
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
                    confirmMessage="Archive this question? It will leave the learner bank."
                    onConfirm={() => archive.mutateAsync(q.id)}
                  >
                    Archive
                  </ConfirmButton>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
