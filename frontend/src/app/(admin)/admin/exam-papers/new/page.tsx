'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Surface } from '@/components/ui/surface';
import {
  ExamPaperForm,
  emptyExamPaperForm,
  toExamPaperPayload,
  type ExamPaperFormValues,
} from '@/features/admin/exam-paper-form';
import { ApiError, apiFetch } from '@/lib/api/client';

export default function NewExamPaperPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async (values: ExamPaperFormValues) => {
      const created = await apiFetch<{ id: string }>('/admin/exam-papers', {
        method: 'POST',
        body: JSON.stringify(toExamPaperPayload(values)),
      });
      return created;
    },
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ['admin-exam-papers'] });
      router.push(`/admin/exam-papers/${created.id}`);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Failed to create');
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="New exam paper"
        description="Saved unpublished by default. Attach questions from the edit screen, then publish."
        actions={
          <Link
            href="/admin/exam-papers"
            className="text-sm font-medium text-[var(--muted)] hover:text-[var(--highlight)]"
          >
            Back to list
          </Link>
        }
      />
      <Surface className="p-6">
        <ExamPaperForm
          initial={emptyExamPaperForm()}
          submitLabel="Create paper"
          pending={create.isPending}
          error={error}
          onSubmit={(values) => {
            setError(null);
            create.mutate(values);
          }}
        />
      </Surface>
    </div>
  );
}
