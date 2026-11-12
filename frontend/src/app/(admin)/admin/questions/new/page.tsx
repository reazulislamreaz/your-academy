'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminFormPanel, AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
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
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="New question"
        description="Saved as a draft. Publish from the edit screen when ready."
        actions={
          <Link href="/admin/questions">
            <Button size="sm" variant="outline">
              Back to list
            </Button>
          </Link>
        }
      />
      <AdminFormPanel
        title="Question draft"
        description="Fill in the stem, classification, and four options. You can publish after saving."
      >
        {categories.isLoading ? (
          <div className="space-y-4" role="status" aria-busy="true" aria-live="polite">
            <span className="sr-only">Loading question form…</span>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="skeleton h-3.5 w-24 rounded-md" />
                <div className="skeleton h-11 w-full rounded-[var(--radius)]" />
              </div>
            ))}
          </div>
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
      </AdminFormPanel>
    </AdminPage>
  );
}
