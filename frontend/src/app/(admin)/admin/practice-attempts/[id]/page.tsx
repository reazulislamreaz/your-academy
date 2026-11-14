'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { PracticeAttemptResult } from '@/lib/api/types';
import { practiceKindLabel } from '@/lib/exam-tags';
import { cn } from '@/lib/utils';

type AdminResult = PracticeAttemptResult & {
  user?: { id: string; name: string; whatsappNumber: string };
};

export default function AdminPracticeAttemptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const result = useQuery({
    queryKey: ['admin-practice-attempt', id],
    queryFn: () => apiFetch<AdminResult>(`/admin/practice-attempts/${id}`),
  });

  if (result.isLoading) {
    return (
      <AdminPage>
        <p className="text-sm text-[var(--muted-strong)]">Loading attempt…</p>
      </AdminPage>
    );
  }

  if (result.error instanceof ApiError || !result.data) {
    return (
      <AdminPage>
        <Alert variant="danger">Could not load this exam attempt.</Alert>
      </AdminPage>
    );
  }

  const data = result.data;

  return (
    <AdminPage>
      <PageHeader
        eyebrow={practiceKindLabel(data.practiceSet.kind)}
        title={data.practiceSet.title}
        description="Student answer review (admin)."
        actions={
          <Link href="/admin/practice-attempts">
            <Button size="sm" variant="outline">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        }
      />

      {data.user ? (
        <p className="text-sm text-[var(--muted-strong)]">
          Student:{' '}
          <Link
            href={`/admin/users/${data.user.id}`}
            className="font-semibold text-[var(--ink)] hover:underline"
          >
            {data.user.name}
          </Link>{' '}
          · {data.user.whatsappNumber}
        </p>
      ) : null}

      <Surface elevated className="grid gap-4 p-5 sm:grid-cols-4">
        <div>
          <p className="text-xs text-[var(--muted-strong)]">Score</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {data.score ?? 0}/{data.maxScore ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted-strong)]">Percent</p>
          <p className="font-display text-2xl font-bold tabular-nums">{data.percentScore ?? 0}%</p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted-strong)]">Correct / Wrong / Skip</p>
          <p className="font-display text-2xl font-bold tabular-nums">
            {data.correctCount ?? 0}/{data.wrongCount ?? 0}/{data.skippedCount ?? 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-[var(--muted-strong)]">Status</p>
          <Badge variant="outline" className="mt-2">
            {data.status}
          </Badge>
        </div>
      </Surface>

      <div className="space-y-3">
        {data.review.map((item, index) => (
          <Surface key={item.questionId} elevated className="space-y-2 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-medium">
                {index + 1}. {item.title}
              </h3>
              <Badge
                variant={
                  item.isCorrect === true
                    ? 'success'
                    : !item.selectedOptionId
                      ? 'warning'
                      : 'danger'
                }
              >
                {item.isCorrect === true
                  ? 'Correct'
                  : !item.selectedOptionId
                    ? 'Unanswered'
                    : 'Incorrect'}
              </Badge>
            </div>
            <p className="text-sm whitespace-pre-wrap text-[var(--ink-soft)]">{item.content}</p>
            <ul className="grid gap-1.5">
              {item.options.map((opt) => (
                <li
                  key={opt.id}
                  className={cn(
                    'rounded-[var(--radius-sm)] border px-3 py-2 text-sm',
                    opt.isCorrect && 'border-[var(--success)]/40 bg-[var(--success-soft)]',
                    item.selectedOptionId === opt.id &&
                      !opt.isCorrect &&
                      'border-[var(--danger)]/40 bg-[var(--danger-soft)]',
                    item.selectedOptionId !== opt.id && !opt.isCorrect && 'border-[var(--line)]',
                  )}
                >
                  <span className="font-semibold">{opt.label}.</span> {opt.content}
                  {item.selectedOptionId === opt.id ? ' (selected)' : null}
                </li>
              ))}
            </ul>
            {item.explanation ? (
              <p className="text-sm text-[var(--ink-soft)]">
                <span className="font-semibold">Explanation:</span> {item.explanation}
              </p>
            ) : null}
          </Surface>
        ))}
      </div>
    </AdminPage>
  );
}
