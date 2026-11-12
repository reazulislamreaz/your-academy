'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Download, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { type UploadBatch } from '@/features/admin/question-imports/types';
import { ApiError, apiFetch } from '@/lib/api/client';
import { adminDownloadUrl, apiUploadForm } from '@/lib/api/upload';
import type { CategoryNode } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { AdminPage } from '@/components/admin/admin-page';

const STEPS = [
  { id: 1, title: 'Select file', hint: 'Excel or CSV' },
  { id: 2, title: 'Configure', hint: 'Collection details' },
  { id: 3, title: 'Validate', hint: 'Upload & check' },
] as const;

const TEMPLATE_COLUMNS = [
  'প্রশ্ন নং',
  'প্রশ্ন',
  'পরীক্ষার নাম ও সাল',
  'ক',
  'খ',
  'গ',
  'ঘ',
  'উত্তর',
];

export default function NewQuestionImportPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [subcategoryName, setSubcategoryName] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const selectedCategory = useMemo(
    () => (categories.data ?? []).find((c) => c.name === categoryName),
    [categories.data, categoryName],
  );

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new ApiError('FILE_REQUIRED', 'Choose a file first', 400);
      if (!displayName.trim()) throw new ApiError('TITLE_REQUIRED', 'Title is required', 400);
      if (!categoryName.trim()) throw new ApiError('CATEGORY_REQUIRED', 'Category is required', 400);
      setProgress(15);
      const form = new FormData();
      form.append('file', file);
      form.append('displayName', displayName.trim());
      form.append('subjectHint', categoryName.trim());
      if (subcategoryName.trim()) form.append('topicHint', subcategoryName.trim());
      setProgress(55);
      const result = await apiUploadForm<UploadBatch>('/admin/question-imports/upload', form);
      setProgress(100);
      return result.data;
    },
    onSuccess: (batch) => {
      void qc.invalidateQueries({ queryKey: ['admin-question-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-question-import-stats'] });
      router.push(`/admin/question-imports/${batch.id}?step=preview`);
    },
    onError: (err) => {
      setProgress(null);
      setError(err instanceof ApiError ? err.message : 'Upload failed');
    },
  });

  const canContinueStep1 = Boolean(file);
  const canContinueStep2 = Boolean(displayName.trim() && categoryName.trim());

  return (
    <AdminPage className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Bulk upload"
        title="New question collection"
        description="Follow the steps to upload, configure, and validate your Excel file."
        actions={
          <Link href="/admin/question-imports">
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
                    : 'border-[var(--line)] bg-white',
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
              <h2 className="font-display text-lg font-bold">Select Excel file</h2>
              <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
                Upload the Google Sheets MCQ template as `.xlsx` or `.csv` — no column renaming needed.
                Answers use ক / খ / গ / ঘ.
              </p>
            </div>
            <a href={adminDownloadUrl('/admin/question-imports/template')}>
              <Button type="button" variant="outline" className="cursor-pointer">
                <Download className="size-4" />
                Download template
              </Button>
            </a>
          </div>

          <FileDropzone file={file} onFileChange={setFile} />

          <div className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <FileSpreadsheet className="size-4 text-[var(--highlight)]" />
              Template columns
            </p>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_COLUMNS.map((col) => (
                <span
                  key={col}
                  className="border border-[var(--line)] bg-white px-2.5 py-1 text-xs font-semibold text-[var(--ink-soft)]"
                >
                  {col}
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-[var(--muted-strong)]">
              Category is set in the next step for the whole collection. Exam name/year from the sheet
              is kept when present. Title rows above the header are ignored automatically.
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
              Title and category apply to this upload. Subcategory is optional.
            </p>
          </div>

          <div className="grid gap-3">
            <Field>
              <Label htmlFor="display-name">Title</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="অনুবাদ সাহিত্য · BCS set"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="category">Category</Label>
              <div className="flex gap-2">
                <Select
                  id="category"
                  className="min-w-0 flex-1"
                  value={categoryName}
                  onChange={(e) => {
                    setCategoryName(e.target.value);
                    setSubcategoryName('');
                  }}
                  required
                >
                  <option value="">
                    {(categories.data ?? []).length === 0
                      ? 'No categories yet — create one'
                      : 'Select category…'}
                  </option>
                  {(categories.data ?? []).map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </Select>
                <QuickCreateCategoryButton
                  onCreated={(created) => {
                    setCategoryName(created.name);
                    setSubcategoryName('');
                  }}
                />
              </div>
            </Field>
            <Field>
              <Label htmlFor="subcategory">Subcategory (Optional)</Label>
              <div className="flex gap-2">
                <Select
                  id="subcategory"
                  className="min-w-0 flex-1"
                  value={subcategoryName}
                  onChange={(e) => setSubcategoryName(e.target.value)}
                  disabled={!selectedCategory}
                >
                  <option value="">
                    {selectedCategory
                      ? selectedCategory.children.length
                        ? 'None'
                        : 'No subcategories'
                      : 'Select a category first…'}
                  </option>
                  {(selectedCategory?.children ?? []).map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </Select>
                <QuickCreateSubcategoryButton
                  parentId={selectedCategory?.id ?? null}
                  parentName={selectedCategory?.name}
                  onCreated={(created) => {
                    setSubcategoryName(created.name);
                  }}
                />
              </div>
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
            <h2 className="font-display text-lg font-bold">Validate & preview</h2>
            <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
              We will parse the file, detect duplicates, and open the preview for import.
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
              <p className="text-sm text-[var(--ink-soft)]">{categoryName || '—'}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--muted-strong)]">Subcategory</p>
              <p className="text-sm text-[var(--ink-soft)]">{subcategoryName || 'None'}</p>
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
              disabled={!file || !displayName.trim() || !categoryName.trim() || upload.isPending}
              onClick={() => {
                setError(null);
                upload.mutate();
              }}
            >
              <Sparkles className="size-4" />
              {upload.isPending ? 'Validating…' : 'Upload & open preview'}
            </Button>
          </div>
        </Surface>
      ) : null}
    </AdminPage>
  );
}
