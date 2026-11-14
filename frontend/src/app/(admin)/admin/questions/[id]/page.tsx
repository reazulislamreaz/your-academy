'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { AdminFormPanel, AdminPage } from '@/components/admin/admin-page';
import { AdminPublishStatus } from '@/components/admin/admin-status';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import {
  QuestionForm,
  toQuestionPayload,
  type QuestionFormValues,
} from '@/features/admin/question-form';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminQuestionDetail } from '@/lib/api/admin-types';
import type { CategoryNode } from '@/lib/api/types';
import { AdminQuestionFormPageSkeleton } from '@/components/skeletons';

export default function EditQuestionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
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
      questionDate: q.questionDate ? q.questionDate.slice(0, 10) : '',
      difficulty: q.difficulty as QuestionFormValues['difficulty'],
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

  const duplicate = useMutation({
    mutationFn: () =>
      apiFetch<{ id: string }>(`/admin/questions/${params.id}/duplicate`, { method: 'POST' }),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
      router.push(`/admin/questions/${created.id}`);
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Duplicate failed'),
  });

  if (detail.isLoading || !initial) {
    return <AdminQuestionFormPageSkeleton />;
  }

  if (detail.error || !detail.data) {
    return <Alert variant="danger">Question not found.</Alert>;
  }

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Content"
        title="Edit question"
        description={detail.data.title}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminPublishStatus status={detail.data.status} />
            <Link href="/admin/questions">
              <Button variant="outline" size="sm">
                Back to list
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
        ) : (
          <Link href={`/questions/${detail.data.id}`} target="_blank">
            <Button size="sm" variant="outline">
              Preview as learner
            </Button>
          </Link>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={duplicate.isPending}
          onClick={() => duplicate.mutate()}
        >
          Duplicate
        </Button>
        {detail.data.status !== 'ARCHIVED' ? (
          <ConfirmButton
            size="sm"
            variant="outline"
            confirmTitle="Archive this question?"
            confirmMessage="Archive this question? It will leave the learner bank."
            confirmLabel="Archive"
            reversible
            onConfirm={() => archive.mutateAsync()}
          >
            Archive
          </ConfirmButton>
        ) : null}
      </div>

      {msg ? <Alert variant="success">{msg}</Alert> : null}

      <AdminFormPanel title="Question details" description="Update the stem, options, and classification.">
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
      </AdminFormPanel>
    </AdminPage>
  );
}
