'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';
import { ContentIn } from '@/components/ui/skeleton';
import { ApiError, apiFetch } from '@/lib/api/client';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';
import { AdminPracticeSetsPageSkeleton } from '@/components/skeletons';
import { useCursorList } from '@/lib/hooks/use-cursor-list';

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

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 200);
}

export default function AdminPracticeSetsPage() {
  const qc = useQueryClient();
  const [status, setStatus] = useState('');
  const [kind, setKind] = useState('');
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [createKind, setCreateKind] = useState('SUBJECT_QUIZ');
  const [questionIdsRaw, setQuestionIdsRaw] = useState('');
  const [examTag, setExamTag] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const list = useCursorList<AdminPracticeSet>(
    ['admin-practice-sets', status, kind],
    (cursor) => {
      const qs = new URLSearchParams({ limit: '30' });
      if (status) qs.set('status', status);
      if (kind) qs.set('kind', kind);
      if (cursor) qs.set('cursor', cursor);
      return `/admin/practice-sets?${qs}`;
    },
  );

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

  const create = useMutation({
    mutationFn: () => {
      const questionIds = questionIdsRaw
        .split(/[\s,]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      return apiFetch('/admin/practice-sets', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          slug: (slug.trim() || slugify(title)).trim(),
          kind: createKind,
          questionIds,
          ...(examTag.trim() ? { examTag: examTag.trim() } : {}),
        }),
      });
    },
    onSuccess: () => {
      setFormError(null);
      setTitle('');
      setSlug('');
      setQuestionIdsRaw('');
      setExamTag('');
      void qc.invalidateQueries({ queryKey: ['admin-practice-sets'] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not create practice set');
    },
  });

  const items = list.items;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Practice sets"
        description="Create drafts from question IDs, then publish quizzes, daily sets, and model tests."
      />

      <Surface className="space-y-4 p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
          Create draft set
        </h2>
        {formError ? <Alert variant="danger">{formError}</Alert> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <Label htmlFor="ps-title">Title</Label>
            <Input
              id="ps-title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slug || slug === slugify(title)) setSlug(slugify(e.target.value));
              }}
              placeholder="BCS Bangla warm-up"
            />
          </Field>
          <Field>
            <Label htmlFor="ps-slug">Slug</Label>
            <Input
              id="ps-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="bcs-bangla-warm-up"
            />
          </Field>
          <Field>
            <Label htmlFor="ps-create-kind">Kind</Label>
            <Select
              id="ps-create-kind"
              value={createKind}
              onChange={(e) => setCreateKind(e.target.value)}
            >
              <option value="DAILY_QUIZ">Daily quiz</option>
              <option value="SUBJECT_QUIZ">Subject quiz</option>
              <option value="TOPIC_QUIZ">Topic quiz</option>
              <option value="MODEL_TEST">Model test</option>
              <option value="PREVIOUS_YEAR_SET">Previous-year style</option>
            </Select>
          </Field>
          <Field>
            <Label htmlFor="ps-exam">Exam tag (optional)</Label>
            <Input
              id="ps-exam"
              value={examTag}
              onChange={(e) => setExamTag(e.target.value)}
              placeholder="bcs-prelim"
            />
          </Field>
          <Field className="sm:col-span-2">
            <Label htmlFor="ps-qids">Question IDs (comma or whitespace separated)</Label>
            <Textarea
              id="ps-qids"
              value={questionIdsRaw}
              onChange={(e) => setQuestionIdsRaw(e.target.value)}
              rows={3}
              placeholder="uuid-1, uuid-2, uuid-3"
            />
          </Field>
        </div>
        <Button
          type="button"
          disabled={create.isPending || !title.trim() || !questionIdsRaw.trim()}
          onClick={() => create.mutate()}
        >
          {create.isPending ? 'Creating…' : 'Create draft'}
        </Button>
      </Surface>

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
          description="Create a draft above with at least one published question ID."
        />
      ) : null}

      {!list.isLoading && items.length > 0 ? (
        <ContentIn className="space-y-3">
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
                    confirmTitle="Archive this practice set?"
                    confirmMessage="Archive this practice set? Learners will no longer see it."
                    confirmLabel="Archive"
                    reversible
                    disabled={archive.isPending}
                    onConfirm={() => archive.mutate(item.id)}
                  >
                    Archive
                  </ConfirmButton>
                ) : null}
              </div>
            </Surface>
          ))}
          <LoadMoreButton
            hasNextPage={list.hasNextPage}
            isFetchingNextPage={list.isFetchingNextPage}
            onLoadMore={() => void list.fetchNextPage()}
          />
        </ContentIn>
      ) : null}
    </div>
  );
}
