'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Download, FileSpreadsheet, FileText, Sparkles } from 'lucide-react';
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
  { id: 1, title: 'Select file', hint: 'Excel, CSV, or Word' },
  { id: 2, title: 'Configure', hint: 'Collection details' },
  { id: 3, title: 'Validate', hint: 'Upload & check' },
] as const;

const WRITTEN_ACCEPT =
  '.xlsx,.csv,.docx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/csv';
const WRITTEN_ACCEPT_HINT =
  'Only .xlsx, .csv, and .docx are supported. Convert legacy .doc to .docx first.';

const TEMPLATE_COLUMNS = [
  'প্রশ্ন নং',
  'প্রশ্ন',
  'পরীক্ষার নাম ও সাল',
  'প্রশ্নের তারিখ',
  'নম্বর',
  'মডেল উত্তর',
];

/** One Excel can appear under up to 8 subcategories (homepage / Preli bank slots). */
const MAX_PLACEMENTS = 8;

export default function NewQuestionImportPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [questionDate, setQuestionDate] = useState('');
  const [placementSubcategoryIds, setPlacementSubcategoryIds] = useState<string[]>([]);
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

  const selectedPlacementNames = useMemo(() => {
    if (!selectedCategory) return [];
    return placementSubcategoryIds
      .map((id) => selectedCategory.children.find((c) => c.id === id)?.name)
      .filter((n): n is string => Boolean(n));
  }, [selectedCategory, placementSubcategoryIds]);

  const togglePlacement = (id: string) => {
    setPlacementSubcategoryIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_PLACEMENTS) return prev;
      return [...prev, id];
    });
  };

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
      if (selectedPlacementNames[0]) {
        form.append('topicHint', selectedPlacementNames[0]);
      }
      if (placementSubcategoryIds.length) {
        form.append('placementSubcategoryIds', JSON.stringify(placementSubcategoryIds));
      }
      if (questionDate.trim()) {
        form.append('questionDate', questionDate.trim());
      }
      setProgress(55);
      const result = await apiUploadForm<UploadBatch>('/admin/written-question-imports/upload', form);
      setProgress(100);
      return result.data;
    },
    onSuccess: (batch) => {
      void qc.invalidateQueries({ queryKey: ['admin-written-question-imports'] });
      void qc.invalidateQueries({ queryKey: ['admin-written-question-import-stats'] });
      router.push(`/admin/written-question-imports/${batch.id}?step=preview`);
    },
    onError: (err) => {
      setProgress(null);
      if (err instanceof ApiError) {
        setError(err.code && err.code !== 'HTTP_ERROR' ? `${err.message} (${err.code})` : err.message);
        return;
      }
      setError(err instanceof Error ? err.message : 'Upload failed');
    },
  });

  const isDocx = Boolean(file?.name.toLowerCase().endsWith('.docx'));
  const canContinueStep1 = Boolean(file);
  const canContinueStep2 = Boolean(
    displayName.trim() && categoryName.trim() && (questionDate.trim() || isDocx),
  );

  return (
    <AdminPage className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Written Question Bank"
        title="New written collection"
        description="Upload .xlsx, .csv, or .docx, configure placements, then preview and confirm before import."
        actions={
          <Link href="/admin/written-question-imports">
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
                Prefer Excel for large banks. Word (`.docx`) also accepts real exam papers (header +
                `০১।` prompts with `ক)–ঙ)` / `a)–e)` sub-lines). Model answers optional — blank →
                draft. Legacy `.doc` is not supported.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={adminDownloadUrl('/admin/written-question-imports/template')}>
                <Button type="button" variant="outline" className="cursor-pointer">
                  <Download className="size-4" />
                  Excel template
                </Button>
              </a>
              <a href={adminDownloadUrl('/admin/written-question-imports/template?format=docx')}>
                <Button type="button" variant="outline" className="cursor-pointer">
                  <FileText className="size-4" />
                  Word (.docx) sample
                </Button>
              </a>
            </div>
          </div>

          <FileDropzone
            file={file}
            onFileChange={setFile}
            accept={WRITTEN_ACCEPT}
            acceptHint={WRITTEN_ACCEPT_HINT}
            dropTitle="Drag & drop your written question file here"
            dropHint="or click to browse · .xlsx / .csv / .docx · up to 15MB"
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
              Excel/CSV: first-column title rows above the header become the set preamble. Mid-sheet
              section headers are shown between questions. Category + placements are set next.
            </p>
          </div>

          <div className="rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] p-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
              <FileText className="size-4 text-[var(--highlight)]" />
              Word (.docx) structuring
            </p>
            <ul className="space-y-2 text-xs leading-relaxed text-[var(--muted-strong)]">
              <li>
                <span className="font-semibold text-[var(--ink-soft)]">Real exam papers:</span>{' '}
                header (authority, post,{' '}
                <code className="text-[var(--ink)]">সময়; পরীক্ষার তারিখ; পূর্ণমান</code>) then
                numbered prompts (<code className="text-[var(--ink)]">০১।</code> /{' '}
                <code className="text-[var(--ink)]">1.</code>). Sub-lines{' '}
                <code className="text-[var(--ink)]">ক)–ঙ)</code> /{' '}
                <code className="text-[var(--ink)]">a)–e)</code> stay under the parent question.
                Unicode math (<code className="text-[var(--ink)]">x² ÷ × –</code>) is preserved.
                Answers are not required.
              </li>
              <li>
                <span className="font-semibold text-[var(--ink-soft)]">Template table:</span> same
                six Excel headers in a Word table; leave{' '}
                <span className="font-medium">মডেল উত্তর</span> blank when unknown.
              </li>
              <li>
                <span className="font-semibold text-[var(--ink-soft)]">Labeled blocks:</span>{' '}
                separated by a blank line or <code className="text-[var(--ink)]">---</code> with{' '}
                <code className="text-[var(--ink)]">প্রশ্ন নং:</code> /{' '}
                <code className="text-[var(--ink)]">প্রশ্ন:</code> /{' '}
                <code className="text-[var(--ink)]">নম্বর:</code> /{' '}
                <code className="text-[var(--ink)]">মডেল উত্তর:</code> (optional{' '}
                <code className="text-[var(--ink)]">উত্তর:</code> /{' '}
                <code className="text-[var(--ink)]">ব্যাখ্যা:</code>).
              </li>
              <li>
                <span className="font-semibold text-[var(--ink-soft)]">Not supported:</span> binary{' '}
                <code className="text-[var(--ink)]">.doc</code>. Save/Download as{' '}
                <code className="text-[var(--ink)]">.docx</code> first (no server-side conversion).
              </li>
            </ul>
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
              Title and category apply to this upload. Select up to {MAX_PLACEMENTS} subcategories so
              this Excel appears in multiple homepage / Preli bank slots.
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
              <Label htmlFor="question-date">
                Question date{isDocx ? ' (optional for exam .docx)' : ''}
              </Label>
              <Input
                id="question-date"
                type="date"
                value={questionDate}
                onChange={(e) => setQuestionDate(e.target.value)}
                required={!isDocx}
              />
              <p className="mt-1.5 text-xs text-[var(--muted-strong)]">
                Default when rows omit <span className="font-medium">প্রশ্নের তারিখ</span>. Exam
                `.docx` files usually carry <span className="font-medium">পরীক্ষার তারিখ</span> in
                the header (or `YYYY-MM-DD` in the filename) — leave blank to auto-fill.
              </p>
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
                    setPlacementSubcategoryIds([]);
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
                    setPlacementSubcategoryIds([]);
                  }}
                />
              </div>
            </Field>

            <Field>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <Label>Subcategory placements (up to {MAX_PLACEMENTS})</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--muted-strong)]">
                    {placementSubcategoryIds.length}/{MAX_PLACEMENTS} selected
                  </span>
                  <QuickCreateSubcategoryButton
                    parentId={selectedCategory?.id ?? null}
                    parentName={selectedCategory?.name}
                    onCreated={(created) => {
                      setPlacementSubcategoryIds((prev) => {
                        if (prev.includes(created.id) || prev.length >= MAX_PLACEMENTS) return prev;
                        return [...prev, created.id];
                      });
                    }}
                  />
                </div>
              </div>

              {!selectedCategory ? (
                <p className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--bg-desk)] px-4 py-6 text-sm text-[var(--muted-strong)]">
                  Select a category first to choose placement subcategories.
                </p>
              ) : selectedCategory.children.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-[var(--line)] bg-[var(--bg-desk)] px-4 py-6 text-sm text-[var(--muted-strong)]">
                  No subcategories yet — create one with the + button.
                </p>
              ) : (
                <ul className="grid gap-2 sm:grid-cols-2">
                  {selectedCategory.children.map((t) => {
                    const checked = placementSubcategoryIds.includes(t.id);
                    const disabled = !checked && placementSubcategoryIds.length >= MAX_PLACEMENTS;
                    return (
                      <li key={t.id}>
                        <label
                          className={cn(
                            'flex cursor-pointer items-start gap-3 rounded-[12px] border px-3 py-3 transition-colors',
                            checked
                              ? 'border-[var(--highlight)] bg-[var(--highlight-soft)]'
                              : 'border-[var(--line)] bg-[var(--bg-elevated)] hover:border-[var(--highlight)]/40',
                            disabled && 'cursor-not-allowed opacity-50',
                          )}
                        >
                          <input
                            type="checkbox"
                            className="mt-1 size-4 accent-[var(--highlight)]"
                            checked={checked}
                            disabled={disabled}
                            onChange={() => togglePlacement(t.id)}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-[var(--ink)]">
                              {t.name}
                            </span>
                            {checked && placementSubcategoryIds[0] === t.id ? (
                              <span className="mt-0.5 block text-xs text-[var(--muted-strong)]">
                                Primary placement
                              </span>
                            ) : null}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-2 text-xs leading-relaxed text-[var(--muted-strong)]">
                Tip: select 5–8 related subtopics (e.g. Bangla, English, GK) so this one file shows in
                each of those homepage / bank filters.
              </p>
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
              We will parse the file, accept duplicate stems and blank question text, skip only genuinely invalid rows, and open the preview for import.
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
              <p className="text-xs font-semibold text-[var(--muted-strong)]">Placements</p>
              <p className="text-sm text-[var(--ink-soft)]">
                {selectedPlacementNames.length
                  ? selectedPlacementNames.join(', ')
                  : 'None (optional)'}
              </p>
            </div>
          </div>

          {error ? <Alert variant="danger">{error}</Alert> : null}

          <FileDropzone
            file={file}
            onFileChange={setFile}
            disabled={upload.isPending}
            progress={progress}
            accept={WRITTEN_ACCEPT}
            acceptHint={WRITTEN_ACCEPT_HINT}
            dropTitle="Confirm the file to upload"
            dropHint="or replace · .xlsx / .csv / .docx · up to 15MB"
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
