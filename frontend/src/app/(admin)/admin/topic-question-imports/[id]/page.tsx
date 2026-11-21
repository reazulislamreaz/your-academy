'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { AdminBulkUploadDetailPageSkeleton } from '@/components/skeletons';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';
import {
  QuickCreateCategoryButton,
  QuickCreateSubcategoryButton,
} from '@/features/admin/categories/quick-create-dialogs';
import { statusTone } from '@/features/admin/question-imports/types';
import { ApiError, apiFetch, apiFetchResult } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import { cn } from '@/lib/utils';

type TopicBatchDetail = {
  id: string;
  batchCode: string;
  displayName: string;
  originalFilename: string;
  status: string;
  totalRows: number;
  importedCount: number;
  questionCount?: number;
  createdAt: string;
  importedAt?: string | null;
  categoryId: string;
  subcategoryId: string;
  childCategoryId: string | null;
  category: { id: string; name: string };
  subcategory: { id: string; name: string; iconKey?: string | null };
  childCategory?: { id: string; name: string; iconKey?: string | null } | null;
  uploadedBy: { id: string; name: string };
};

type TopicAdminQuestion = {
  id: string;
  sourceSerial: string | null;
  questionText: string;
  examLabel: string | null;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctKey: string | null;
  correctAnswer: string | null;
  sortOrder: number;
  rowNumber: number;
};

type QuestionDraft = {
  sourceSerial: string;
  questionText: string;
  examLabel: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctKey: string;
  rowNumber: string;
};

function emptyDraft(): QuestionDraft {
  return {
    sourceSerial: '',
    questionText: '',
    examLabel: '',
    optionA: '',
    optionB: '',
    optionC: '',
    optionD: '',
    correctKey: '',
    rowNumber: '',
  };
}

function draftFromQuestion(q: TopicAdminQuestion): QuestionDraft {
  return {
    sourceSerial: q.sourceSerial ?? '',
    questionText: q.questionText,
    examLabel: q.examLabel ?? '',
    optionA: q.optionA,
    optionB: q.optionB,
    optionC: q.optionC,
    optionD: q.optionD,
    correctKey: q.correctKey ?? '',
    rowNumber: String(q.rowNumber),
  };
}

function QuestionEditorFields({
  draft,
  onChange,
  idPrefix,
}: {
  draft: QuestionDraft;
  onChange: (next: QuestionDraft) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <Label htmlFor={`${idPrefix}-serial`}>প্রশ্ন নং</Label>
          <Input
            id={`${idPrefix}-serial`}
            value={draft.sourceSerial}
            onChange={(e) => onChange({ ...draft, sourceSerial: e.target.value })}
          />
        </Field>
        <Field>
          <Label htmlFor={`${idPrefix}-row`}>Row #</Label>
          <Input
            id={`${idPrefix}-row`}
            type="number"
            min={1}
            value={draft.rowNumber}
            onChange={(e) => onChange({ ...draft, rowNumber: e.target.value })}
          />
        </Field>
      </div>
      <Field>
        <Label htmlFor={`${idPrefix}-exam`}>পরীক্ষার নাম ও সাল</Label>
        <Input
          id={`${idPrefix}-exam`}
          value={draft.examLabel}
          onChange={(e) => onChange({ ...draft, examLabel: e.target.value })}
        />
      </Field>
      <Field>
        <Label htmlFor={`${idPrefix}-q`}>প্রশ্ন</Label>
        <Textarea
          id={`${idPrefix}-q`}
          rows={3}
          value={draft.questionText}
          onChange={(e) => onChange({ ...draft, questionText: e.target.value })}
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        {([
          ['optionA', 'ক'],
          ['optionB', 'খ'],
          ['optionC', 'গ'],
          ['optionD', 'ঘ'],
        ] as const).map(([key, label]) => (
          <Field key={key}>
            <Label htmlFor={`${idPrefix}-${key}`}>{label}</Label>
            <Input
              id={`${idPrefix}-${key}`}
              value={draft[key]}
              onChange={(e) => onChange({ ...draft, [key]: e.target.value })}
            />
          </Field>
        ))}
      </div>
      <Field>
        <Label htmlFor={`${idPrefix}-answer`}>উত্তর</Label>
        <Select
          id={`${idPrefix}-answer`}
          value={draft.correctKey}
          onChange={(e) => onChange({ ...draft, correctKey: e.target.value })}
        >
          <option value="">—</option>
          <option value="a">ক / A</option>
          <option value="b">খ / B</option>
          <option value="c">গ / C</option>
          <option value="d">ঘ / D</option>
        </Select>
      </Field>
    </div>
  );
}

export default function TopicImportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [childCategoryId, setChildCategoryId] = useState('');
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [questionDraft, setQuestionDraft] = useState<QuestionDraft>(emptyDraft());
  const [adding, setAdding] = useState(false);
  const [addDraft, setAddDraft] = useState<QuestionDraft>(emptyDraft());

  const batch = useQuery({
    queryKey: ['admin-topic-import', id],
    queryFn: () => apiFetch<TopicBatchDetail>(`/admin/topic-question-imports/${id}`),
  });

  const categories = useQuery({
    queryKey: ['categories', 'TOPIC'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories?scope=TOPIC'),
  });

  const questions = useInfiniteQuery({
    queryKey: ['admin-topic-import-questions', id],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) => {
      const qs = new URLSearchParams({ limit: '50' });
      if (pageParam) qs.set('cursor', pageParam);
      return apiFetchResult<TopicAdminQuestion[]>(
        `/admin/topic-question-imports/${id}/questions?${qs}`,
      );
    },
    getNextPageParam: (last) => last.pagination?.nextCursor ?? undefined,
  });

  useEffect(() => {
    if (!batch.data) return;
    setDisplayName(batch.data.displayName);
    setCategoryId(batch.data.categoryId);
    setSubcategoryId(batch.data.subcategoryId);
    setChildCategoryId(batch.data.childCategoryId ?? '');
  }, [batch.data]);

  const selectedCategory = useMemo(
    () => (categories.data ?? []).find((c) => c.id === categoryId) ?? null,
    [categories.data, categoryId],
  );
  const selectedSubcategory = useMemo(
    () => selectedCategory?.children?.find((s) => s.id === subcategoryId) ?? null,
    [selectedCategory, subcategoryId],
  );
  const childOptions = selectedSubcategory?.children ?? [];

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ['admin-topic-import', id] });
    void qc.invalidateQueries({ queryKey: ['admin-topic-import-questions', id] });
    void qc.invalidateQueries({ queryKey: ['admin-topic-imports'] });
    void qc.invalidateQueries({ queryKey: ['admin-topic-import-stats'] });
    void qc.invalidateQueries({ queryKey: ['topic-sets'] });
    void qc.invalidateQueries({ queryKey: ['topic-set'] });
    void qc.invalidateQueries({ queryKey: ['topic-set-questions'] });
    void qc.invalidateQueries({ queryKey: ['categories', 'public', 'TOPIC'] });
  };

  const saveMeta = useMutation({
    mutationFn: () =>
      apiFetch<TopicBatchDetail>(`/admin/topic-question-imports/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          displayName,
          categoryId,
          subcategoryId,
          childCategoryId: childCategoryId || null,
        }),
      }),
    onSuccess: () => {
      setEditing(false);
      invalidateAll();
    },
  });

  const archive = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/topic-question-imports/${id}/archive`, { method: 'PATCH' }),
    onSuccess: () => invalidateAll(),
  });

  const remove = useMutation({
    mutationFn: () => apiFetch(`/admin/topic-question-imports/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-topic-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-topic-import-stats'] });
      router.push('/admin/topic-question-imports');
    },
  });

  const saveQuestion = useMutation({
    mutationFn: () => {
      if (!editingQuestionId) throw new Error('No question selected');
      return apiFetch<TopicAdminQuestion>(
        `/admin/topic-question-imports/${id}/questions/${editingQuestionId}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            sourceSerial: questionDraft.sourceSerial || null,
            questionText: questionDraft.questionText,
            examLabel: questionDraft.examLabel || null,
            optionA: questionDraft.optionA,
            optionB: questionDraft.optionB,
            optionC: questionDraft.optionC,
            optionD: questionDraft.optionD,
            correctKey: questionDraft.correctKey || null,
            rowNumber: questionDraft.rowNumber
              ? Number(questionDraft.rowNumber)
              : undefined,
          }),
        },
      );
    },
    onSuccess: () => {
      setEditingQuestionId(null);
      invalidateAll();
    },
  });

  const addQuestion = useMutation({
    mutationFn: () =>
      apiFetch<TopicAdminQuestion>(`/admin/topic-question-imports/${id}/questions`, {
        method: 'POST',
        body: JSON.stringify({
          sourceSerial: addDraft.sourceSerial || null,
          questionText: addDraft.questionText,
          examLabel: addDraft.examLabel || null,
          optionA: addDraft.optionA,
          optionB: addDraft.optionB,
          optionC: addDraft.optionC,
          optionD: addDraft.optionD,
          correctKey: addDraft.correctKey || null,
        }),
      }),
    onSuccess: () => {
      setAdding(false);
      setAddDraft(emptyDraft());
      invalidateAll();
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: (questionId: string) =>
      apiFetch(`/admin/topic-question-imports/${id}/questions/${questionId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => invalidateAll(),
  });

  const rowItems = questions.data?.pages.flatMap((p) => p.data) ?? [];

  if (batch.isLoading) return <AdminBulkUploadDetailPageSkeleton />;

  if (batch.isError || !batch.data) {
    return (
      <EmptyState
        title="Collection not found"
        description="This upload may have been deleted."
        action={
          <Link
            href="/admin/topic-question-imports"
            className="text-sm font-semibold text-[var(--highlight)]"
          >
            Back to collections
          </Link>
        }
      />
    );
  }

  const data = batch.data;

  return (
    <AdminPage>
      <PageHeader
        eyebrow={data.batchCode}
        title={data.displayName}
        description={`${data.originalFilename} · uploaded by ${data.uploadedBy.name} · ${new Date(data.createdAt).toLocaleString()}`}
      />

      {data.status === 'COMPLETED' ? (
        <Alert variant="success">
          Import finished. Edit collection details or individual questions below — changes publish
          immediately to Topic Base.
        </Alert>
      ) : null}
      {data.status === 'ARCHIVED' ? (
        <Alert variant="warning">This collection is archived.</Alert>
      ) : null}

      <div className="motion-stagger grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[
          { label: 'Total rows', value: data.totalRows },
          {
            label: 'Imported',
            value: data.importedCount,
            tone: 'text-[var(--success-fg)]',
          },
          {
            label: 'Questions',
            value: data.questionCount ?? data.importedCount,
          },
        ].map((item) => (
          <Surface key={item.label} interactive className="p-4">
            <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
              {item.label}
            </p>
            <p
              className={cn(
                'mt-1 font-display text-2xl font-bold tabular-nums text-[var(--ink)]',
                item.tone,
              )}
            >
              {item.value}
            </p>
          </Surface>
        ))}
      </div>

      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={statusTone(data.status)}>{data.status}</Badge>
            <Badge variant="outline">{data.category.name}</Badge>
            <Badge variant="outline">{data.subcategory.name}</Badge>
            {data.childCategory ? (
              <Badge variant="info">{data.childCategory.name}</Badge>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setEditing((v) => !v)}
            >
              <Pencil className="size-3.5" />
              {editing ? 'Close editor' : 'Edit details'}
            </Button>
            {data.status !== 'ARCHIVED' ? (
              <ConfirmButton
                size="sm"
                variant="outline"
                confirmTitle="Archive this collection?"
                confirmMessage="Archive this collection? Questions stay in Topic Base."
                confirmLabel="Archive"
                reversible
                disabled={archive.isPending}
                onConfirm={() => archive.mutate()}
              >
                <Archive className="size-3.5" />
                Archive
              </ConfirmButton>
            ) : null}
            <ConfirmButton
              size="sm"
              variant="outline"
              className="text-[var(--danger)]"
              confirmTitle="Delete this collection?"
              confirmMessage="Delete this collection and all of its Topic questions permanently? This cannot be undone."
              confirmLabel="Delete"
              reversible={false}
              disabled={remove.isPending}
              onConfirm={() => remove.mutate()}
            >
              <Trash2 className="size-3.5" />
              Delete
            </ConfirmButton>
          </div>
        </div>

        {editing ? (
          <div className="grid gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] p-4">
            <Field>
              <Label htmlFor="edit-name">Title</Label>
              <Input
                id="edit-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Field>
            <Field>
              <Label htmlFor="edit-category">1 · Category</Label>
              <div className="flex gap-2">
                <Select
                  id="edit-category"
                  className="min-w-0 flex-1"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId('');
                    setChildCategoryId('');
                  }}
                >
                  <option value="">Select category…</option>
                  {(categories.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <QuickCreateCategoryButton
                  scope="TOPIC"
                  onCreated={(created) => {
                    setCategoryId(created.id);
                    setSubcategoryId('');
                    setChildCategoryId('');
                  }}
                />
              </div>
            </Field>
            <Field>
              <Label htmlFor="edit-subcategory">2 · Sub Category</Label>
              <div className="flex gap-2">
                <Select
                  id="edit-subcategory"
                  className="min-w-0 flex-1"
                  value={subcategoryId}
                  onChange={(e) => {
                    setSubcategoryId(e.target.value);
                    setChildCategoryId('');
                  }}
                  disabled={!selectedCategory}
                >
                  <option value="">
                    {selectedCategory ? 'Select sub category…' : 'Select a category first…'}
                  </option>
                  {(selectedCategory?.children ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
                <QuickCreateSubcategoryButton
                  scope="TOPIC"
                  parentId={selectedCategory?.id ?? null}
                  parentName={selectedCategory?.name}
                  onCreated={(created) => {
                    setSubcategoryId(created.id);
                    setChildCategoryId('');
                  }}
                />
              </div>
            </Field>
            <Field>
              <Label htmlFor="edit-child">3 · Child Category (optional)</Label>
              <Select
                id="edit-child"
                value={childCategoryId}
                onChange={(e) => setChildCategoryId(e.target.value)}
                disabled={!selectedSubcategory || childOptions.length === 0}
              >
                <option value="">
                  {!selectedSubcategory
                    ? 'Select a sub category first…'
                    : childOptions.length === 0
                      ? 'No child categories'
                      : 'None'}
                </option>
                {childOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <div>
              <Button
                type="button"
                className="cursor-pointer"
                disabled={
                  saveMeta.isPending ||
                  !displayName.trim() ||
                  !categoryId ||
                  !subcategoryId
                }
                onClick={() => saveMeta.mutate()}
              >
                {saveMeta.isPending ? 'Saving…' : 'Save changes'}
              </Button>
              {saveMeta.isError ? (
                <p className="mt-2 text-sm font-medium text-[var(--danger-fg)]">
                  {saveMeta.error instanceof ApiError
                    ? saveMeta.error.message
                    : 'Could not save'}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </Surface>

      <Surface className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold">Questions</h2>
            <p className="text-sm text-[var(--muted-strong)]">
              Edit stems, exam labels, options, and answers. Blank answers are allowed.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="cursor-pointer"
            onClick={() => {
              setAdding(true);
              setAddDraft(emptyDraft());
              setEditingQuestionId(null);
            }}
          >
            <Plus className="size-3.5" />
            Add question
          </Button>
        </div>

        {adding ? (
          <div className="space-y-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] p-4">
            <h3 className="font-display text-sm font-bold">New question</h3>
            <QuestionEditorFields
              idPrefix="add"
              draft={addDraft}
              onChange={setAddDraft}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="cursor-pointer"
                disabled={addQuestion.isPending || !addDraft.questionText.trim()}
                onClick={() => addQuestion.mutate()}
              >
                {addQuestion.isPending ? 'Adding…' : 'Add to collection'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setAdding(false)}
              >
                Cancel
              </Button>
            </div>
            {addQuestion.isError ? (
              <Alert variant="danger">
                {addQuestion.error instanceof ApiError
                  ? addQuestion.error.message
                  : 'Could not add question'}
              </Alert>
            ) : null}
          </div>
        ) : null}

        {questions.isLoading ? <AdminBulkUploadDetailPageSkeleton /> : null}

        {!questions.isLoading && rowItems.length === 0 ? (
          <EmptyState title="No questions" description="Add a question or re-upload a file." />
        ) : null}

        <div className="min-w-0 w-full max-w-full space-y-3">
          {rowItems.map((row) => {
            const isEditing = editingQuestionId === row.id;
            return (
              <div
                key={row.id}
                className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-elevated)] p-4"
              >
                {isEditing ? (
                  <div className="space-y-3">
                    <QuestionEditorFields
                      idPrefix={`q-${row.id}`}
                      draft={questionDraft}
                      onChange={setQuestionDraft}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        className="cursor-pointer"
                        disabled={saveQuestion.isPending || !questionDraft.questionText.trim()}
                        onClick={() => saveQuestion.mutate()}
                      >
                        {saveQuestion.isPending ? 'Saving…' : 'Save question'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => setEditingQuestionId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                    {saveQuestion.isError ? (
                      <Alert variant="danger">
                        {saveQuestion.error instanceof ApiError
                          ? saveQuestion.error.message
                          : 'Could not save question'}
                      </Alert>
                    ) : null}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
                          Row {row.rowNumber}
                          {row.sourceSerial ? ` · ${row.sourceSerial}` : ''}
                        </p>
                        {row.examLabel ? (
                          <p className="text-sm font-medium text-[var(--muted-strong)]">
                            {row.examLabel}
                          </p>
                        ) : null}
                        <p className="text-sm leading-relaxed font-medium text-[var(--ink)]">
                          {row.questionText}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => {
                            setAdding(false);
                            setEditingQuestionId(row.id);
                            setQuestionDraft(draftFromQuestion(row));
                          }}
                        >
                          <Pencil className="size-3.5" />
                          Edit
                        </Button>
                        <ConfirmButton
                          size="sm"
                          variant="outline"
                          className="text-[var(--danger)]"
                          confirmTitle="Delete this question?"
                          confirmMessage="Remove this question from the collection permanently?"
                          confirmLabel="Delete"
                          reversible={false}
                          disabled={deleteQuestion.isPending}
                          onConfirm={() => deleteQuestion.mutate(row.id)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </ConfirmButton>
                      </div>
                    </div>
                    <div className="grid gap-1 text-sm text-[var(--ink)] sm:grid-cols-2">
                      {([
                        ['A', row.optionA, 'a'],
                        ['B', row.optionB, 'b'],
                        ['C', row.optionC, 'c'],
                        ['D', row.optionD, 'd'],
                      ] as const).map(([label, text, key]) => (
                        <p
                          key={label}
                          className={
                            row.correctKey === key
                              ? 'font-medium text-[var(--success-fg)]'
                              : undefined
                          }
                        >
                          {label}. {text || '—'}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {questions.hasNextPage ? (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={questions.isFetchingNextPage}
            onClick={() => void questions.fetchNextPage()}
          >
            {questions.isFetchingNextPage ? 'Loading…' : 'Load more questions'}
          </Button>
        ) : null}
      </Surface>

      <Link
        href="/admin/topic-question-imports"
        className="text-sm font-semibold text-[var(--highlight)]"
      >
        ← All collections
      </Link>
    </AdminPage>
  );
}
