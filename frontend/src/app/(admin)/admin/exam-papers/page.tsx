'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminExamPaperItem } from '@/lib/api/admin-types';

export default function AdminExamPapersPage() {
  const qc = useQueryClient();
  const list = useQuery({
    queryKey: ['admin-exam-papers'],
    queryFn: () => apiFetch<AdminExamPaperItem[]>('/admin/exam-papers'),
  });

  const remove = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/exam-papers/${id}`, { method: 'DELETE' }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-exam-papers'] }),
  });

  const items = list.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Exam papers"
        description="Group published questions into timed model-test papers by exam body."
        actions={
          <Link href="/admin/exam-papers/new">
            <Button>New paper</Button>
          </Link>
        }
      />

      {list.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      ) : null}

      {!list.isLoading && items.length === 0 ? (
        <EmptyState
          title="No exam papers"
          description="Create your first paper, attach published questions, then publish it."
          action={
            <Link href="/admin/exam-papers/new">
              <Button size="sm">New paper</Button>
            </Link>
          }
        />
      ) : null}

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
        <ul className="divide-y divide-[var(--line)]">
          {items.map((paper) => (
            <li
              key={paper.id}
              className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  href={`/admin/exam-papers/${paper.id}`}
                  className="font-semibold hover:underline"
                >
                  {paper.title}
                </Link>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {paper.examBody}
                  {paper.year ? ` · ${paper.year}` : ''} · {paper.questionCount} questions ·{' '}
                  {paper.durationMinutes} min
                  {paper.totalMarks != null ? ` · ${paper.totalMarks} marks` : ''}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={paper.isPublished ? 'success' : 'highlight'}>
                  {paper.isPublished ? 'Published' : 'Draft'}
                </Badge>
                <Link href={`/admin/exam-papers/${paper.id}`}>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </Link>
                <ConfirmButton
                  size="sm"
                  variant="ghost"
                  confirmMessage={`Delete “${paper.title}”? Its exam attempts are deleted too.`}
                  onConfirm={() => remove.mutate(paper.id)}
                >
                  Delete
                </ConfirmButton>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {remove.error instanceof ApiError ? (
        <p className="text-sm text-[var(--danger)]">{remove.error.message}</p>
      ) : null}
    </div>
  );
}
