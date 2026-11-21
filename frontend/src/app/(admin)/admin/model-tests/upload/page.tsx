'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminFormPanel, AdminPage, AdminSection } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ModelTestGuideEditor } from '@/features/admin/model-tests/model-test-guide-editor';
import { FileDropzone } from '@/features/admin/question-imports/file-dropzone';
import { ApiError } from '@/lib/api/client';
import {
  createAdminModelTestCategory,
  deleteAdminModelTest,
  listAdminModelTestCategories,
  listAdminModelTests,
  updateAdminModelTest,
  uploadAdminModelTest,
} from '@/lib/api/model-tests';
import { adminDownloadUrl } from '@/lib/api/upload';
import type { AdminModelTestUploadResult } from '@your-academy/shared';

export default function AdminModelTestUploadPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationInMinutes, setDurationInMinutes] = useState('60');
  const [examYear, setExamYear] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<AdminModelTestUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tests = useQuery({
    queryKey: ['admin-model-tests'],
    queryFn: listAdminModelTests,
  });

  const categories = useQuery({
    queryKey: ['admin-model-test-categories'],
    queryFn: listAdminModelTestCategories,
  });

  const upload = useMutation({
    mutationFn: uploadAdminModelTest,
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      setFile(null);
      if (!title.trim() && data.suggestedTitle) setTitle(data.suggestedTitle);
      void qc.invalidateQueries({ queryKey: ['admin-model-tests'] });
    },
    onError: (err) => {
      setResult(null);
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    },
  });

  const createCategory = useMutation({
    mutationFn: createAdminModelTestCategory,
    onSuccess: (created) => {
      setCategoryId(created.id);
      setNewCategoryName('');
      setShowNewCategory(false);
      void qc.invalidateQueries({ queryKey: ['admin-model-test-categories'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not create category');
    },
  });

  const togglePublish = useMutation({
    mutationFn: ({ id, next }: { id: string; next: boolean }) =>
      updateAdminModelTest(id, { isPublished: next }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-model-tests'] }),
  });

  const remove = useMutation({
    mutationFn: deleteAdminModelTest,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-model-tests'] }),
  });

  return (
    <AdminPage>
      <PageHeader
        title="Model Test"
        description="Upload Excel · assign category · edit listing guide · publish."
      />

      <AdminSection title="Listing guide">
        <ModelTestGuideEditor />
      </AdminSection>

      <AdminSection title="Upload">
        <AdminFormPanel title="New Model Test">
          <div className="grid gap-4">
            <p className="text-xs text-[var(--muted-strong)]">
              Columns: প্রশ্ন নং · প্রশ্ন · ক · খ · গ · ঘ · উত্তর (a–d). Preamble rows OK.
            </p>

            <Field>
              <Label htmlFor="mt-title">Title</Label>
              <Input
                id="mt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="From Excel if blank"
              />
            </Field>
            <Field>
              <Label htmlFor="mt-desc">Description</Label>
              <Textarea
                id="mt-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field>
                <Label htmlFor="mt-duration">Duration (min)</Label>
                <Input
                  id="mt-duration"
                  type="number"
                  min={1}
                  max={600}
                  value={durationInMinutes}
                  onChange={(e) => setDurationInMinutes(e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="mt-year">Year</Label>
                <Input
                  id="mt-year"
                  type="number"
                  min={1900}
                  max={2100}
                  value={examYear}
                  onChange={(e) => setExamYear(e.target.value)}
                />
              </Field>
              <Field>
                <Label htmlFor="mt-category">Category</Label>
                <select
                  id="mt-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="h-10 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)] px-3 text-sm"
                >
                  <option value="">None</option>
                  {(categories.data ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field>
                <Label htmlFor="mt-published">Visibility</Label>
                <select
                  id="mt-published"
                  value={isPublished ? 'published' : 'draft'}
                  onChange={(e) => setIsPublished(e.target.value === 'published')}
                  className="h-10 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)] px-3 text-sm"
                >
                  <option value="published">Published</option>
                  <option value="draft">Hidden</option>
                </select>
              </Field>
            </div>

            <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] bg-[var(--bg-desk)]/60 p-3">
              {!showNewCategory ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-xs"
                  onClick={() => setShowNewCategory(true)}
                >
                  + Add category
                </Button>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Field className="min-w-0 flex-1">
                    <Label htmlFor="mt-new-cat">New category</Label>
                    <Input
                      id="mt-new-cat"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="e.g. BCS / Bank / Postal"
                      autoFocus
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      className="h-10"
                      disabled={createCategory.isPending || newCategoryName.trim().length < 2}
                      onClick={() => createCategory.mutate(newCategoryName.trim())}
                    >
                      {createCategory.isPending ? 'Saving…' : 'Save'}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-10"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategoryName('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <FileDropzone file={file} onFileChange={setFile} disabled={upload.isPending} />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button
                type="button"
                className="h-10 w-full sm:w-auto"
                disabled={upload.isPending || !file}
                onClick={() => {
                  if (!file) return;
                  upload.mutate({
                    title: title.trim(),
                    description: description.trim() || undefined,
                    durationInMinutes: Number(durationInMinutes),
                    examYear: examYear.trim() ? Number(examYear) : undefined,
                    categoryId: categoryId || undefined,
                    isPublished,
                    file,
                  });
                }}
              >
                {upload.isPending ? 'Uploading…' : 'Create'}
              </Button>
              <a
                href={adminDownloadUrl('/admin/model-tests/template')}
                className="block w-full sm:inline-flex sm:w-auto"
              >
                <Button type="button" variant="outline" className="h-10 w-full sm:w-auto">
                  Template
                </Button>
              </a>
            </div>

            {error ? <Alert variant="danger">{error}</Alert> : null}
            {result ? (
              <Alert>
                <strong>{result.title}</strong> · {result.totalQuestions} Q ·{' '}
                {result.durationInMinutes} min
                {result.category ? ` · ${result.category.name}` : ''}
                {result.examYear ? ` · ${result.examYear}` : ''}.{' '}
                <Link href={`/model-test/${result.slug}`} className="font-semibold underline">
                  Open
                </Link>
                {result.parseWarnings.length ? (
                  <p className="mt-2 text-sm">Warnings: {result.parseWarnings.join('; ')}</p>
                ) : null}
              </Alert>
            ) : null}

            {result?.preview?.length ? (
              <ul className="max-h-48 space-y-1.5 overflow-y-auto">
                {result.preview.slice(0, 5).map((q, i) => (
                  <li
                    key={q.id}
                    className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)] px-3 py-2 text-xs"
                  >
                    <span className="font-medium text-[var(--ink)]">
                      {i + 1}. {q.questionText}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </AdminFormPanel>
      </AdminSection>

      <AdminSection title="Manage">
        <AdminFormPanel title="Published & drafts">
          {tests.isLoading ? (
            <p className="text-sm text-[var(--muted)]">Loading…</p>
          ) : tests.data?.length ? (
            <ul className="divide-y divide-[var(--line)]">
              {tests.data.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col gap-2.5 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words text-[var(--ink)]">{item.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                      {item.totalQuestions} Q · {item.durationInMinutes} min
                      {item.category ? ` · ${item.category.name}` : ''}
                      {item.examYear ? ` · ${item.examYear}` : ''} ·{' '}
                      {item.isPublished ? 'Published' : 'Hidden'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    <Link href={`/model-test/${item.slug}`}>
                      <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                        View
                      </Button>
                    </Link>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs"
                      disabled={togglePublish.isPending}
                      onClick={() =>
                        togglePublish.mutate({ id: item.id, next: !item.isPublished })
                      }
                    >
                      {item.isPublished ? 'Hide' : 'Publish'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-2.5 text-xs text-[var(--danger)]"
                      disabled={remove.isPending}
                      onClick={() => {
                        if (window.confirm(`Delete “${item.title}”?`)) {
                          remove.mutate(item.id);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">No Model Tests yet.</p>
          )}
        </AdminFormPanel>
      </AdminSection>
    </AdminPage>
  );
}
