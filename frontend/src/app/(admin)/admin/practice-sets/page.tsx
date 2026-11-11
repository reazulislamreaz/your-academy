'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { apiFetch, apiFetchResult } from '@/lib/api/client';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { AdminPracticeSetsPageSkeleton } from '@/components/skeletons';

type AdminPracticeSet = {
  id: string;
  title: string;
  slug: string;
  kind: string;
  status: string;
  examTag?: string | null;
  questionCount: number;
  attemptCount: number;
  updatedAt: string;
  category?: { id: string; name: string } | null;
};

export default function AdminPracticeSetsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');

  const list = useQuery({
    queryKey: ['admin-practice-sets', status, kind],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '50' });
      if (status) qs.set('status', status);
      if (kind) qs.set('kind', kind);
      return apiFetchResult<AdminPracticeSet[]>(`/admin/practice-sets?${qs}`);
    },
  });

  const publish = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/practice-sets/${id}/publish`, { method: 'PATCH' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-practice-sets'] });
    },
  });

  const archive = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/admin/practice-sets/${id}/archive`, { method: 'PATCH' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-practice-sets'] });
    },
  });

  const items = list.data?.data ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Practice sets"
        description="Publish and archive quizzes, daily sets, model tests, and previous-year style collections."
      />

      <Surface className="flex flex-wrap items-center gap-3 p-4">
        <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="ps-status">
          Status
        </label>
        <Select
          id="ps-status"
          className="h-10 w-auto min-w-[10rem]"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
        <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="ps-kind">
          Kind
        </label>
        <Select
          id="ps-kind"
          className="h-10 w-auto min-w-[12rem]"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">All</option>
          <option value="DAILY_QUIZ">Daily quiz</option>
          <option value="SUBJECT_QUIZ">Subject quiz</option>
          <option value="TOPIC_QUIZ">Topic quiz</option>
          <option value="MODEL_TEST">Model test</option>
          <option value="PREVIOUS_YEAR_SET">Previous-year style</option>
        </Select>
      </Surface>

      {list.isLoading ? <AdminPracticeSetsPageSkeleton omitHeader /> : null}

      {!list.isLoading && items.length === 0 ? (
        <EmptyState
          title="No practice sets"
          description="Seed data or POST /admin/practice-sets to create quizzes and model tests."
        />
      ) : null}

      <div className="space-y-3">
        {items.map((item) => (
          <Surface key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="mb-1 flex flex-wrap gap-1.5">
                <Badge variant="highlight">{practiceKindLabel(item.kind)}</Badge>
                <Badge variant="outline">{item.status}</Badge>
                {item.examTag ? <Badge variant="outline">{examLabel(item.examTag)}</Badge> : null}
              </div>
              <h3 className="truncate font-display text-base font-semibold">{item.title}</h3>
              <p className="text-xs text-[var(--muted-strong)]">
                {item.questionCount} questions · {item.attemptCount} attempts
                {item.category ? ` · ${item.category.name}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {item.status !== 'PUBLISHED' ? (
                <Button
                  type="button"
                  size="sm"
                  className="cursor-pointer"
                  disabled={publish.isPending}
                  onClick={() => publish.mutate(item.id)}
                >
                  Publish
                </Button>
              ) : null}
              {item.status !== 'ARCHIVED' ? (
                <ConfirmButton
                  size="sm"
                  variant="outline"
                  confirmMessage="Archive this practice set?"
                  disabled={archive.isPending}
                  onConfirm={() => archive.mutate(item.id)}
                >
                  Archive
                </ConfirmButton>
              ) : null}
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
