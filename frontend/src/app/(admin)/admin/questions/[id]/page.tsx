'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import {
  QuestionForm,
  toQuestionPayload,
  type QuestionFormValues,
} from '@/features/admin/question-form';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminQuestionDetail } from '@/lib/api/admin-types';
import type { CategoryNode } from '@/lib/api/types';

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const detail = useQuery({
    queryKey: ['admin-question', params.id],
    queryFn: () => apiFetch<AdminQuestionDetail>(`/admin/questions/${params.id}`),
  });

  const initial = useMemo<QuestionFormValues | null>(() => {
    const q = detail.data;
    if (!q) return null;
    const sorted = [...q.options].sort((a, b) => a.sortOrder - b.sortOrder);
    const labels = ['A', 'B', 'C', 'D'];
    const options = labels.map((label) => sorted.find((o) => o.label === label)?.content ?? '');
    const correct = sorted.find((o) => o.isCorrect)?.label ?? 'A';
    return {
      title: q.title,
      content: q.content,
      explanation: q.explanation ?? '',
      categoryId: q.categoryId,
      subcategoryId: q.subcategoryId ?? '',
      difficulty: q.difficulty as QuestionFormValues['difficulty'],
      kind: (q.kind ?? 'MCQ') as QuestionFormValues['kind'],
      modelAnswer: q.modelAnswer ?? '',
      options,
      correct,
    };
  }, [detail.data]);

  const save = useMutation({
    mutationFn: (values: QuestionFormValues) =>
      apiFetch(`/admin/questions/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(toQuestionPayload(values)),
      }),
    onSuccess: () => {
      setMsg('Saved');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-question', params.id] });
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
    },
    onError: (err) => {
      setMsg(null);
      setError(err instanceof ApiError ? err.message : 'Save failed');
    },
  });

  const publish = useMutation({
    mutationFn: () => apiFetch(`/admin/questions/${params.id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      setMsg('Published');
      void qc.invalidateQueries({ queryKey: ['admin-question', params.id] });
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
      void qc.invalidateQueries({ queryKey: ['questions'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Publish failed'),
  });

  const archive = useMutation({
    mutationFn: () => apiFetch(`/admin/questions/${params.id}/archive`, { method: 'POST' }),
    onSuccess: () => {
      setMsg('Archived');
      void qc.invalidateQueries({ queryKey: ['admin-question', params.id] });
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
    },
  });

  if (detail.isLoading || !initial) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (detail.error || !detail.data) {
    return <Alert variant="danger">Question not found.</Alert>;
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Edit question"
        description={detail.data.title}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={
                detail.data.status === 'PUBLISHED'
                  ? 'success'
                  : detail.data.status === 'ARCHIVED'
                    ? 'outline'
                    : 'highlight'
              }
            >
              {detail.data.status}
            </Badge>
            <Link href="/admin/questions">
              <Button variant="ghost" size="sm">
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="flex flex-wrap gap-2">
        {detail.data.status !== 'PUBLISHED' ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={publish.isPending}
            onClick={() => publish.mutate()}
          >
            Publish
          </Button>
        ) : null}
        {detail.data.status !== 'ARCHIVED' ? (
          <ConfirmButton
            size="sm"
            variant="outline"
            confirmMessage="Archive this question?"
            onConfirm={() => archive.mutateAsync()}
          >
            Archive
          </ConfirmButton>
        ) : null}
      </div>

      {msg ? <Alert variant="success">{msg}</Alert> : null}

      <Surface className="p-6">
        <QuestionForm
          key={detail.data.id + detail.data.status}
          categories={categories.data ?? []}
          initial={initial}
          submitLabel="Save changes"
          pending={save.isPending}
          error={error}
          onSubmit={(values) => {
            setError(null);
            setMsg(null);
            save.mutate(values);
          }}
        />
      </Surface>
    </div>
  );
}
