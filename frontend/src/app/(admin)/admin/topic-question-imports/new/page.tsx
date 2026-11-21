'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Download, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import {
  QuickCreateCategoryButton,
  QuickCreateSubcategoryButton,
} from '@/features/admin/categories/quick-create-dialogs';
import { FileDropzone } from '@/features/admin/question-imports/file-dropzone';
import { ApiError, apiFetch } from '@/lib/api/client';
import {
  uploadTopicQuestions,
  type TopicUploadBatchSummary,
} from '@/lib/api/topic-questions';
import { adminDownloadUrl } from '@/lib/api/upload';
import type { CategoryNode } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Select file', hint: 'Excel .xlsx' },
  { id: 2, title: 'Configure', hint: 'Collection details' },
  { id: 3, title: 'Import', hint: 'Upload & publish' },
] as const;

const TOPIC_ACCEPT =
  '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel';
const TOPIC_ACCEPT_HINT = 'Only .xlsx / .xls files are supported for Topic Base uploads.';

const TEMPLATE_COLUMNS = [
  'প্রশ্ন নং',
  'প্রশ্ন',
  'পরীক্ষার নাম ও সাল',
  'ক',
  'খ',
  'গ',
  'ঘ',
  'উত্তর',
] as const;

export default function NewTopicQuestionImportPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ['categories', 'TOPIC'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories?scope=TOPIC'),
  });

  const selectedCategory = useMemo(
    () => (categories.data ?? []).find((c) => c.id === categoryId),
    [categories.data, categoryId],
  );

  const selectedSubcategory = useMemo(
    () => selectedCategory?.children.find((c) => c.id === subcategoryId),
    [selectedCategory, subcategoryId],
  );

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new ApiError('FILE_REQUIRED', 'Choose a file first', 400);
      if (!displayName.trim()) throw new ApiError('TITLE_REQUIRED', 'Title is required', 400);
      if (!categoryId) throw new ApiError('CATEGORY_REQUIRED', 'Category is required', 400);
      if (!subcategoryId) {
        throw new ApiError('SUBCATEGORY_REQUIRED', 'Subcategory is required', 400);
      }
      setProgress(20);
      const result = await uploadTopicQuestions({
        file,
        categoryId,
        subcategoryId,
        displayName: displayName.trim(),
      });
      setProgress(100);
      return result;
    },
    onSuccess: (batch: TopicUploadBatchSummary) => {
      void qc.invalidateQueries({ queryKey: ['admin-topic-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-topic-import-stats'] });
      void qc.invalidateQueries({ queryKey: ['admin-categories', 'TOPIC'] });
      void qc.invalidateQueries({ queryKey: ['categories', 'TOPIC'] });
      router.push(`/topic-base/${batch.subcategory.id}`);
    },
    onError: (err) => {
      setProgress(null);
      if (err instanceof ApiError) {
        setError(
          err.code && err.code !== 'HTTP_ERROR' ? `${err.message} (${err.code})` : err.message,
        );
        return;
      }
      setError(err instanceof Error ? err.message : 'Upload failed');
    },
  });

  const canContinueStep1 = Boolean(file);
  const canContinueStep2 = Boolean(displayName.trim() && categoryId && subcategoryId);

  return (
    <AdminPage className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Topic Base Question Analysis"
        title="New topic collection"
        description="Upload the 8-column Excel template, pick a Topic category/subcategory, then import — duplicates and soft gaps are allowed."
        actions={
          <Link href="/admin/topic-question-imports">
            <Button type="button" variant="outline" className="cursor-pointer">
              <ArrowLeft className="size-4" />
              Collections
            </Button>
          </Link>
        }
      />

      <ol className="grid gap-2 sm:grid-cols-3">
        {STEPS.map((s) => {
          const active = step === s.id;
          const done = step > s.id;
          return (
            <li
              key={s.id}
              className={cn(
                'rounded-[14px] border px-3 py-3',
                active
                  ? 'border-[var(--highlight)] bg-[var(--highlight-soft)]'
                  : done
                    ? 'border-[var(--success)]/30 bg-[var(--success-soft)]'
                    : 'border-[var(--line)] bg-[var(--bg-elevated)]',
              )}
            >
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wide uppercase">
                <span
                  className={cn(
                    'flex size-6 items-center justify-center rounded-full text-xs font-bold',
                    active || done
                      ? 'bg-[var(--highlight)] text-white'
                      : 'bg-[var(--bg-muted)] text-[var(--muted-strong)]',
                    done && 'bg-[var(--success)]',
                  )}
                >
                  {done ? <Check className="size-3.5" /> : s.id}
                </span>
                <span className={active || done ? 'text-[var(--ink)]' : 'text-[var(--muted-strong)]'}>
                  {s.title}
                </span>
              </p>
              <p className="mt-1 pl-8 text-sm leading-relaxed text-[var(--muted-strong)]">{s.hint}</p>
            </li>
          );
        })}
      </ol>

      {step === 1 ? (
        <Surface className="space-y-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Select file</h2>
              <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
                Prefer the official Topic Base Excel template for large banks. Duplicate stems and
                blank answers still import — no Preli/Written coupling.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={adminDownloadUrl('/admin/topic-question-imports/template')}>
                <Button type="button" variant="outline" className="cursor-pointer">
                  <Download className="size-4" />
                  Excel template
                </Button>
              </a>
            </div>
          </div>

          <FileDropzone
            file={file}
            onFileChange={setFile}
            accept={TOPIC_ACCEPT}
            acceptHint={TOPIC_ACCEPT_HINT}
            dropTitle="Drag & drop your Topic Base Excel file here"
            dropHint="or click to browse · .xlsx / .xls · up to 15MB"
          />

          <div className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <FileSpreadsheet className="size-4 text-[var(--highlight)]" />
              Template columns
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_COLUMNS.map((col) => (
                <span
                  key={col}
                  className="border border-[var(--line)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs font-semibold text-[var(--ink-soft)]"
                >
                  {col}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted-strong)]">
              <span className="font-medium text-[var(--ink-soft)]">উত্তর</span> accepts ক / খ / গ / ঘ
              or a / b / c / d. Category and subcategory are set next (Topics taxonomy only).
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!canContinueStep1}
              onClick={() => setStep(2)}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </Surface>
      ) : null}

      {step === 2 ? (
        <Surface className="space-y-5 p-5">
          <div>
            <h2 className="font-display text-lg font-bold">Configure collection</h2>
            <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
              Title and Topic Base category / subcategory apply to this upload.
            </p>
          </div>

          <div className="grid gap-3">
            <Field>
              <Label htmlFor="display-name">Title</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="চর্যাপদ · Topic analysis"
                required
              />
            </Field>

            <Field>
              <Label htmlFor="category">Topic category</Label>
              <div className="flex gap-2">
                <Select
                  id="category"
                  className="min-w-0 flex-1"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setSubcategoryId('');
                  }}
                  required
                >
                  <option value="">
                    {(categories.data ?? []).length === 0
                      ? 'No categories yet — create one'
                      : 'Select category…'}
                  </option>
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
                  }}
                />
              </div>
            </Field>

            <Field>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label htmlFor="subcategory">Subcategory / topic</Label>
                <QuickCreateSubcategoryButton
                  scope="TOPIC"
                  parentId={selectedCategory?.id ?? null}
                  parentName={selectedCategory?.name}
                  onCreated={(created) => setSubcategoryId(created.id)}
                />
              </div>
              {!selectedCategory ? (
                <p className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--bg-desk)] px-4 py-6 text-sm text-[var(--muted-strong)]">
                  Select a category first to choose a subcategory.
                </p>
              ) : (selectedCategory.children ?? []).length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--bg-desk)] px-4 py-6 text-sm text-[var(--muted-strong)]">
                  No subcategories yet — create one with the + button.
                </p>
              ) : (
                <Select
                  id="subcategory"
                  value={subcategoryId}
                  onChange={(e) => setSubcategoryId(e.target.value)}
                  required
                >
                  <option value="">Select subcategory…</option>
                  {selectedCategory.children.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <div className="flex flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={!canContinueStep2}
              onClick={() => setStep(3)}
            >
              Continue
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </Surface>
      ) : null}

      {step === 3 ? (
        <Surface className="space-y-5 p-5">
          <div>
            <h2 className="font-display text-lg font-bold">Import & publish</h2>
            <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
              We will parse the file and import every non-empty row into this topic — no duplicate
              blocking and no validation rejection.
            </p>
          </div>

          <div className="grid gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] p-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-[var(--muted-strong)]">File</p>
              <p className="text-sm font-semibold text-[var(--ink)]">{file?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--muted-strong)]">Title</p>
              <p className="text-sm font-semibold text-[var(--ink)]">{displayName || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--muted-strong)]">Category</p>
              <p className="text-sm text-[var(--ink-soft)]">{selectedCategory?.name ?? '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--muted-strong)]">Subcategory</p>
              <p className="text-sm text-[var(--ink-soft)]">{selectedSubcategory?.name ?? '—'}</p>
            </div>
          </div>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <FileDropzone
            file={file}
            onFileChange={setFile}
            disabled={upload.isPending}
            progress={progress}
          />

          <div className="flex flex-wrap justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              className="cursor-pointer"
              disabled={upload.isPending}
              onClick={() => setStep(2)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="cursor-pointer"
              disabled={
                !file ||
                !displayName.trim() ||
                !categoryId ||
                !subcategoryId ||
                upload.isPending
              }
              onClick={() => {
                setError(null);
                upload.mutate();
              }}
            >
              <Sparkles className="size-4" />
              {upload.isPending ? 'Importing…' : 'Import questions'}
            </Button>
          </div>
        </Surface>
      ) : null}
    </AdminPage>
  );
}
