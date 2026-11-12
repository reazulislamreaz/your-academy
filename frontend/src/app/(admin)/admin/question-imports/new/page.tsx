'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Download, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { FileDropzone } from '@/features/admin/question-imports/file-dropzone';
import {
  type UploadBatch,
  slugifyBatchCode,
} from '@/features/admin/question-imports/types';
import { ApiError, apiFetch } from '@/lib/api/client';
import { adminDownloadUrl, apiUploadForm } from '@/lib/api/upload';
import { EXAM_TRACKS } from '@/lib/exam-tags';
import type { CategoryNode } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'Select file', hint: 'Excel or CSV' },
  { id: 2, title: 'Configure', hint: 'Collection details' },
  { id: 3, title: 'Validate', hint: 'Upload & check' },
] as const;

const TEMPLATE_COLUMNS = [
  'Question',
  'Option A–D',
  'Correct Answer',
  'Explanation',
  'Subject',
  'Topic',
  'Difficulty',
  'Exam Category',
  'Exam Year',
  'Source',
];

export default function NewQuestionImportPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(1);
  const [file, setFile] = useState<File | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [batchCode, setBatchCode] = useState('');
  const [autoCode, setAutoCode] = useState(true);
  const [description, setDescription] = useState('');
  const [subjectName, setSubjectName] = useState('');
  const [topicName, setTopicName] = useState('');
  const [examCategory, setExamCategory] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const selectedSubject = useMemo(
    () => (categories.data ?? []).find((c) => c.name === subjectName),
    [categories.data, subjectName],
  );

  useEffect(() => {
    if (!autoCode) return;
    const seed = displayName || file?.name.replace(/\.(xlsx|csv)$/i, '') || '';
    if (!seed) {
      setBatchCode('');
      return;
    }
    setBatchCode(slugifyBatchCode(seed));
  }, [autoCode, displayName, file]);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new ApiError('FILE_REQUIRED', 'Choose a file first', 400);
      setProgress(15);
      const form = new FormData();
      form.append('file', file);
      if (displayName.trim()) form.append('displayName', displayName.trim());
      if (batchCode.trim()) form.append('batchCode', batchCode.trim());
      if (description.trim()) form.append('description', description.trim());
      if (subjectName) form.append('subjectHint', subjectName);
      if (topicName) form.append('topicHint', topicName);
      if (examCategory) form.append('examCategoryHint', examCategory);
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
  const canContinueStep2 = Boolean(displayName.trim() || file);

  return (
    <div className="mx-auto max-w-4xl space-y-8">
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
                Use the official template so columns validate cleanly.
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
              Required columns
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
              Name the batch and set defaults used when Excel cells are empty.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <Label htmlFor="display-name">Collection name</Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="BCS Preliminary 2025 Set 01"
              />
            </Field>
            <Field>
              <Label htmlFor="batch-code">Batch code</Label>
              <Input
                id="batch-code"
                value={batchCode}
                onChange={(e) => {
                  setAutoCode(false);
                  setBatchCode(e.target.value.toUpperCase());
                }}
                placeholder="BCS_PRELIMINARY_2025_SET_01"
              />
              <button
                type="button"
                className="mt-1 cursor-pointer text-xs font-semibold text-[var(--highlight)]"
                onClick={() => setAutoCode(true)}
              >
                Auto-generate from name
              </button>
            </Field>
            <Field>
              <Label htmlFor="exam">Examination category</Label>
              <Select
                id="exam"
                value={examCategory}
                onChange={(e) => setExamCategory(e.target.value)}
              >
                <option value="">From Excel rows</option>
                {EXAM_TRACKS.map((t) => (
                  <option key={t.tag} value={t.label}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="subject">Default subject</Label>
              <Select
                id="subject"
                value={subjectName}
                onChange={(e) => {
                  setSubjectName(e.target.value);
                  setTopicName('');
                }}
              >
                <option value="">From Excel rows</option>
                {(categories.data ?? []).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="topic">Default topic</Label>
              <Select
                id="topic"
                value={topicName}
                onChange={(e) => setTopicName(e.target.value)}
                disabled={!selectedSubject}
              >
                <option value="">From Excel rows</option>
                {(selectedSubject?.children ?? []).map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short note about this question set"
              />
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
              <p className="text-xs font-semibold text-[var(--muted-strong)]">Collection</p>
              <p className="text-sm font-semibold text-[var(--ink)]">
                {displayName || file?.name.replace(/\.(xlsx|csv)$/i, '') || '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--muted-strong)]">Batch code</p>
              <p className="font-mono text-sm font-medium text-[var(--ink)]">
                {batchCode || '(auto on upload)'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-[var(--muted-strong)]">Defaults</p>
              <p className="text-sm text-[var(--ink-soft)]">
                {[subjectName || 'Subject from Excel', topicName || 'Topic from Excel', examCategory || 'Exam from Excel']
                  .filter(Boolean)
                  .join(' · ')}
              </p>
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
              disabled={!file || upload.isPending}
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
    </div>
  );
}
