'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminFormPanel, AdminPage, AdminSection, AdminToolbar } from '@/components/admin/admin-page';
import { AdminListCard } from '@/components/admin/admin-list-card';
import { AdminPublishStatus } from '@/components/admin/admin-status';
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
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [marksPerCorrect, setMarksPerCorrect] = useState('1');
  const [negativeMark, setNegativeMark] = useState('0');
  const [passMarkPercent, setPassMarkPercent] = useState('');
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
      const minutes = Number(durationMinutes);
      const marks = Number(marksPerCorrect);
      const neg = Number(negativeMark);
      const pass = passMarkPercent.trim() === '' ? null : Number(passMarkPercent);
      return apiFetch('/admin/practice-sets', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          slug: (slug.trim() || slugify(title)).trim(),
          kind: createKind,
          questionIds,
          ...(examTag.trim() ? { examTag: examTag.trim() } : {}),
          durationSeconds:
            Number.isFinite(minutes) && minutes > 0 ? Math.round(minutes * 60) : null,
          marksPerCorrect: Number.isFinite(marks) && marks >= 0 ? marks : 1,
          negativeMarkPerWrong: Number.isFinite(neg) && neg >= 0 ? neg : 0,
          ...(pass != null && Number.isFinite(pass) ? { passMarkPercent: pass } : {}),
        }),
      });
    },
    onSuccess: () => {
      setFormError(null);
      setTitle('');
      setSlug('');
      setQuestionIdsRaw('');
      setExamTag('');
      setDurationMinutes('30');
      setMarksPerCorrect('1');
      setNegativeMark('0');
      setPassMarkPercent('');
      void qc.invalidateQueries({ queryKey: ['admin-practice-sets'] });
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Could not create practice set');
    },
  });

  const items = list.items;

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Content"
        title="Practice sets"
        description="Build quizzes and model tests from published question IDs, then publish when ready."
      />

      <AdminFormPanel
        title="Create draft set"
        description="Paste one or more published question UUIDs. Slug auto-fills from the title."
        footer={
          <Button
            type="button"
            disabled={create.isPending || !title.trim() || !questionIdsRaw.trim()}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'Creating…' : 'Create draft'}
          </Button>
        }
      >
        {formError ? <Alert variant="danger">{formError}</Alert> : null}
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Field>
            <Label htmlFor="ps-duration">Duration (minutes)</Label>
            <Input
              id="ps-duration"
              type="number"
              min={0}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              placeholder="30 (blank/0 = untimed)"
            />
          </Field>
          <Field>
            <Label htmlFor="ps-marks">Marks per correct</Label>
            <Input
              id="ps-marks"
              type="number"
              min={0}
              step="0.25"
              value={marksPerCorrect}
              onChange={(e) => setMarksPerCorrect(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="ps-neg">Negative mark per wrong</Label>
            <Input
              id="ps-neg"
              type="number"
              min={0}
              step="0.25"
              value={negativeMark}
              onChange={(e) => setNegativeMark(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="ps-pass">Pass mark % (optional)</Label>
            <Input
              id="ps-pass"
              type="number"
              min={0}
              max={100}
              value={passMarkPercent}
              onChange={(e) => setPassMarkPercent(e.target.value)}
              placeholder="e.g. 40"
            />
          </Field>
          <Field className="sm:col-span-2">
            <Label htmlFor="ps-qids">Question IDs</Label>
            <Textarea
              id="ps-qids"
              value={questionIdsRaw}
              onChange={(e) => setQuestionIdsRaw(e.target.value)}
              rows={3}
              placeholder="uuid-1, uuid-2, uuid-3"
            />
            <p className="mt-1.5 text-xs text-[var(--muted-strong)]">
              Separate with commas or spaces. Only published questions can be included.
            </p>
          </Field>
        </div>
      </AdminFormPanel>

      <AdminSection title="Library" description="Filter and manage existing practice sets.">
        <AdminToolbar>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <label className="text-sm font-medium text-[var(--muted-strong)]" htmlFor="ps-status">
              Status
            </label>
            <Select
              id="ps-status"
              className="h-10 w-full sm:w-40"
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
              className="h-10 w-full sm:w-48"
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
          </div>
        </AdminToolbar>

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
              <AdminListCard
                key={item.id}
                badges={
                  <>
                    <Badge variant="highlight">{practiceKindLabel(item.kind)}</Badge>
                    <AdminPublishStatus status={item.status} />
                    {item.examTag ? <Badge variant="outline">{examLabel(item.examTag)}</Badge> : null}
                  </>
                }
                title={item.title}
                meta={
                  <>
                    {item.questionCount} questions · {item.attemptCount} attempts
                    {item.category ? ` · ${item.category.name}` : ''}
                    {' · '}
                    Updated {new Date(item.updatedAt).toLocaleDateString()}
                  </>
                }
                actions={
                  <>
                    {item.status !== 'PUBLISHED' ? (
                      <Button
                        type="button"
                        size="sm"
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
                  </>
                }
              />
            ))}
            <LoadMoreButton
              hasNextPage={list.hasNextPage}
              isFetchingNextPage={list.isFetchingNextPage}
              onLoadMore={() => void list.fetchNextPage()}
            />
          </ContentIn>
        ) : null}
      </AdminSection>
    </AdminPage>
  );
}
