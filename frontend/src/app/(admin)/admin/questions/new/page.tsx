'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Surface } from '@/components/ui/surface';
import {
  QuestionForm,
  emptyQuestionForm,
  toQuestionPayload,
  type QuestionFormValues,
} from '@/features/admin/question-form';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';

export default function NewQuestionPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const create = useMutation({
    mutationFn: async (values: QuestionFormValues) => {
      const created = await apiFetch<{ id: string }>('/admin/questions', {
        method: 'POST',
        body: JSON.stringify(toQuestionPayload(values)),
      });
      return created;
    },
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['admin-questions'] });
      router.push(`/admin/questions/${created.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create');
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="New question"
        description="Saved as a draft. Publish from the edit screen when ready."
        actions={
          <Link href="/admin/questions" className="text-sm font-medium text-[var(--muted)] hover:text-[var(--highlight)]">
            Back to list
          </Link>
        }
      />
      <Surface className="p-6">
        {categories.isLoading ? (
          <p className="text-sm text-[var(--muted)]">Loading categories…</p>
        ) : (
          <QuestionForm
            key={categories.data?.[0]?.id ?? 'empty'}
            categories={categories.data ?? []}
            initial={emptyQuestionForm(categories.data?.[0]?.id ?? '')}
            submitLabel="Create draft"
            pending={create.isPending}
            error={error}
            onSubmit={(values) => {
              setError(null);
              create.mutate(values);
            }}
          />
        )}
      </Surface>
    </div>
  );
}
