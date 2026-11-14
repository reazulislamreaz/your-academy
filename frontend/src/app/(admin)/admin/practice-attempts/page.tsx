'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { AdminPage, AdminToolbar } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { ContentIn } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { practiceKindLabel } from '@/lib/exam-tags';
import { useCursorList } from '@/lib/hooks/use-cursor-list';

type AdminAttemptRow = {
  id: string;
  status: string;
  submittedAt?: string | null;
  elapsedSeconds?: number | null;
  score?: number | null;
  maxScore?: number | null;
  percentScore?: number | null;
  passed?: boolean | null;
  correctCount?: number | null;
  wrongCount?: number | null;
  skippedCount?: number | null;
  user: { id: string; name: string; whatsappNumber: string };
  practiceSet: {
    id: string;
    title: string;
    kind: string;
    examTag?: string | null;
    category?: { id: string; name: string } | null;
  };
};

function AdminPracticeAttemptsContent() {
  const search = useSearchParams();
  const [userId, setUserId] = useState(search.get('userId') ?? '');
  const [practiceSetId, setPracticeSetId] = useState(search.get('practiceSetId') ?? '');
  const [status, setStatus] = useState(search.get('status') ?? '');
  const [minPercent, setMinPercent] = useState('');
  const [maxPercent, setMaxPercent] = useState('');

  const list = useCursorList<AdminAttemptRow>(
    ['admin-practice-attempts', userId, practiceSetId, status, minPercent, maxPercent],
    (cursor) => {
      const qs = new URLSearchParams({ limit: '30' });
      if (userId.trim()) qs.set('userId', userId.trim());
      if (practiceSetId.trim()) qs.set('practiceSetId', practiceSetId.trim());
      if (status) qs.set('status', status);
      if (minPercent.trim()) qs.set('minPercent', minPercent.trim());
      if (maxPercent.trim()) qs.set('maxPercent', maxPercent.trim());
      if (cursor) qs.set('cursor', cursor);
      return `/admin/practice-attempts?${qs}`;
    },
  );

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Analytics"
        title="Exam results"
        description="Review student quiz and model-test attempts with score filters."
      />

      <AdminToolbar>
        <div className="grid w-full gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Field>
            <Label htmlFor="filter-user">User ID</Label>
            <Input
              id="filter-user"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="UUID"
            />
          </Field>
          <Field>
            <Label htmlFor="filter-set">Practice set ID</Label>
            <Input
              id="filter-set"
              value={practiceSetId}
              onChange={(e) => setPracticeSetId(e.target.value)}
              placeholder="UUID"
            />
          </Field>
          <Field>
            <Label htmlFor="filter-status">Status</Label>
            <Select id="filter-status" value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Submitted + expired</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="EXPIRED">Expired</option>
              <option value="IN_PROGRESS">In progress</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="filter-min">Min %</Label>
            <Input
              id="filter-min"
              type="number"
              value={minPercent}
              onChange={(e) => setMinPercent(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="filter-max">Max %</Label>
            <Input
              id="filter-max"
              type="number"
              value={maxPercent}
              onChange={(e) => setMaxPercent(e.target.value)}
            />
          </Field>
        </div>
      </AdminToolbar>

      {list.isError ? <Alert variant="danger">Could not load exam attempts.</Alert> : null}

      {!list.isLoading && list.items.length === 0 ? (
        <EmptyState title="No attempts match" description="Adjust filters or wait for student exams." />
      ) : null}

      <ContentIn className="space-y-3">
        {list.items.map((row) => (
          <Surface key={row.id} elevated className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline">{row.status}</Badge>
                  <Badge variant="highlight">{practiceKindLabel(row.practiceSet.kind)}</Badge>
                  {row.passed != null ? (
                    <Badge variant={row.passed ? 'success' : 'danger'}>
                      {row.passed ? 'Passed' : 'Failed'}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="font-display text-base font-semibold">
                  <Link
                    href={`/admin/practice-attempts/${row.id}`}
                    className="hover:text-[var(--highlight)]"
                  >
                    {row.practiceSet.title}
                  </Link>
                </h3>
                <p className="text-sm text-[var(--muted-strong)]">
                  <Link
                    href={`/admin/users/${row.user.id}`}
                    className="font-medium text-[var(--ink)] hover:underline"
                  >
                    {row.user.name}
                  </Link>{' '}
                  · {row.user.whatsappNumber}
                  {row.practiceSet.category ? ` · ${row.practiceSet.category.name}` : ''}
                </p>
                <p className="text-xs text-[var(--muted-strong)]">
                  {row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '—'}
                  {row.elapsedSeconds != null
                    ? ` · ${Math.floor(row.elapsedSeconds / 60)}m ${row.elapsedSeconds % 60}s`
                    : ''}
                  {` · ✓${row.correctCount ?? 0} ✗${row.wrongCount ?? 0} —${row.skippedCount ?? 0}`}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-bold tabular-nums">
                  {row.percentScore != null ? `${row.percentScore}%` : '—'}
                </p>
                <p className="text-xs tabular-nums text-[var(--muted-strong)]">
                  {row.score ?? '—'}
                  {row.maxScore != null ? `/${row.maxScore}` : ''}
                </p>
              </div>
            </div>
          </Surface>
        ))}
        <LoadMoreButton
          hasNextPage={list.hasNextPage}
          isFetchingNextPage={list.isFetchingNextPage}
          onLoadMore={() => void list.fetchNextPage()}
        />
      </ContentIn>
    </AdminPage>
  );
}

export default function AdminPracticeAttemptsPage() {
  return (
    <Suspense
      fallback={
        <AdminPage>
          <p className="text-sm text-[var(--muted-strong)]">Loading exam results…</p>
        </AdminPage>
      }
    >
      <AdminPracticeAttemptsContent />
    </Suspense>
  );
}
