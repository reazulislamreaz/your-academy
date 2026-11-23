'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, ExternalLink, PencilLine } from 'lucide-react';
import type { AdminExamDetail, AdminExamQuestion } from '@your-academy/shared';
import { AdminFormPanel, AdminPage, AdminSection } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { Field, FieldHint } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError } from '@/lib/api/client';
import {
  deleteAdminExam,
  getAdminExam,
  updateAdminExam,
  updateAdminExamQuestion,
} from '@/lib/api/exams';
import { revalidateExamsCache } from '@/lib/api/revalidate-exams';

const OPTION_LABELS = ['ক', 'খ', 'গ', 'ঘ'] as const;

function messageOf(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

export default function AdminExamEditPage() {
  const { id } = useParams<{ id: string }>();
  const exam = useQuery({ queryKey: ['admin-exam', id], queryFn: () => getAdminExam(id) });

  return (
    <AdminPage>
      <div>
        <Link href="/admin/exams/upload">
          <Button size="sm" variant="outline" className="gap-1.5">
            <ArrowLeft className="size-4" aria-hidden />
            All quizzes
          </Button>
        </Link>
      </div>
      {exam.isLoading ? <p className="text-sm text-[var(--muted)]">Loading quiz…</p> : null}
      {exam.error ? (
        <LoadError
          message={
            exam.error instanceof ApiError && exam.error.status === 404
              ? 'This quiz no longer exists.'
              : 'Could not load this quiz.'
          }
          onRetry={() => void exam.refetch()}
        />
      ) : null}
      {exam.data ? <ExamEditor exam={exam.data} /> : null}
    </AdminPage>
  );
}

function ExamEditor({ exam }: { exam: AdminExamDetail }) {
  const qc = useQueryClient();
  const router = useRouter();
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const remove = useMutation({
    mutationFn: () => deleteAdminExam(exam.id),
    onSuccess: async () => {
      void qc.invalidateQueries({ queryKey: ['admin-exams'] });
      await revalidateExamsCache();
      router.push('/admin/exams/upload');
    },
    onError: (err) => setDeleteError(messageOf(err, 'Could not delete the quiz')),
  });

  return (
    <>
      <PageHeader
        eyebrow="Quiz"
        title={exam.title}
        description={`${exam.totalQuestions} questions · ${exam.durationInMinutes} minutes · ${exam.attemptCount} attempts`}
        actions={
          <>
            {exam.isPublished ? <Badge variant="success">Published</Badge> : <Badge variant="warning">Draft</Badge>}
            <Link href={`/exams/${encodeURIComponent(exam.slug)}`} target="_blank">
              <Button size="sm" variant="outline" className="gap-1.5">
                <ExternalLink className="size-4" aria-hidden />
                View live
              </Button>
            </Link>
          </>
        }
      />

      <AdminSection title="Quiz details">
        <ExamMetaForm exam={exam} />
      </AdminSection>

      <AdminSection
        title="Questions"
        description="Fix a question, its options, the correct answer, or the explanation. Scores of past attempts are not recalculated."
      >
        <ol className="space-y-3">
          {exam.questions.map((q, i) => (
            <QuestionRow key={q.id} examId={exam.id} question={q} index={i} />
          ))}
        </ol>
      </AdminSection>

      <AdminSection title="Delete quiz">
        <AdminFormPanel title="Danger zone">
          <p className="mb-3 text-sm text-[var(--muted-strong)]">
            Permanently removes this quiz, its {exam.totalQuestions} questions
            {exam.attemptCount ? `, and ${exam.attemptCount} learner attempt${exam.attemptCount === 1 ? '' : 's'}` : ''}.
            To hide it temporarily instead, untick &ldquo;Published&rdquo; above.
          </p>
          {deleteError ? <Alert variant="danger" className="mb-3">{deleteError}</Alert> : null}
          <ConfirmButton
            variant="danger"
            size="sm"
            confirmTitle="Delete this quiz?"
            confirmMessage={`Delete “${exam.title}”${exam.attemptCount ? ` and ${exam.attemptCount} attempt(s)` : ''}? This cannot be undone.`}
            confirmLabel="Delete quiz"
            onConfirm={() => remove.mutateAsync()}
          >
            Delete quiz
          </ConfirmButton>
        </AdminFormPanel>
      </AdminSection>
    </>
  );
}

function ExamMetaForm({ exam }: { exam: AdminExamDetail }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(exam.title);
  const [description, setDescription] = useState(exam.description ?? '');
  const [duration, setDuration] = useState(String(exam.durationInMinutes));
  const [published, setPublished] = useState(exam.isPublished);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitle(exam.title);
    setDescription(exam.description ?? '');
    setDuration(String(exam.durationInMinutes));
    setPublished(exam.isPublished);
  }, [exam]);

  const durationNum = Number(duration);
  const valid = title.trim().length > 0 && Number.isInteger(durationNum) && durationNum >= 1 && durationNum <= 600;

  const save = useMutation({
    mutationFn: () =>
      updateAdminExam(exam.id, {
        title: title.trim(),
        description: description.trim() || null,
        durationInMinutes: durationNum,
        isPublished: published,
      }),
    onSuccess: async (next) => {
      qc.setQueryData(['admin-exam', exam.id], next);
      void qc.invalidateQueries({ queryKey: ['admin-exams'] });
      setError(null);
      setSaved(true);
      await revalidateExamsCache();
    },
    onError: (err) => {
      setSaved(false);
      setError(messageOf(err, 'Could not save the quiz'));
    },
  });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    save.mutate();
  }

  return (
    <AdminFormPanel title="Details">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <Field>
          <Label htmlFor="exam-title">Title</Label>
          <Input id="exam-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
          <FieldHint className="text-xs">The link stays the same when you rename a quiz.</FieldHint>
        </Field>
        <Field>
          <Label htmlFor="exam-description">Description (optional)</Label>
          <Textarea id="exam-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
        </Field>
        <Field className="max-w-xs">
          <Label htmlFor="exam-duration">Duration (minutes)</Label>
          <Input
            id="exam-duration"
            type="number"
            min={1}
            max={600}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            aria-invalid={!valid}
          />
        </Field>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--accent)]"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <span>
            <span className="font-semibold">Published</span>
            <span className="block text-xs text-[var(--muted-strong)]">
              Unpublished quizzes disappear from the Quiz list and their links show “not found”.
            </span>
          </span>
        </label>
        {error ? <Alert variant="danger">{error}</Alert> : null}
        {saved ? <Alert variant="success">Quiz saved.</Alert> : null}
        <Button type="submit" loading={save.isPending} disabled={!valid || save.isPending}>
          Save details
        </Button>
      </form>
    </AdminFormPanel>
  );
}

function QuestionRow({
  examId,
  question,
  index,
}: {
  examId: string;
  question: AdminExamQuestion;
  index: number;
}) {
  const [editing, setEditing] = useState(false);
  const correct = question.correctOptionIndex;

  return (
    <li className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4">
      {editing ? (
        <QuestionForm examId={examId} question={question} index={index} onDone={() => setEditing(false)} />
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <p className="type-prose-title break-words text-[var(--ink)]">
              {index + 1}. {question.questionText}
            </p>
            <ul className="grid gap-1 text-sm sm:grid-cols-2">
              {question.options.map((opt, i) => (
                <li
                  key={i}
                  className={i === correct ? 'font-semibold text-[var(--success,#15803d)]' : 'text-[var(--muted-strong)]'}
                >
                  {OPTION_LABELS[i]}. {opt}
                  {i === correct ? <span className="sr-only"> (correct answer)</span> : null}
                </li>
              ))}
            </ul>
            {correct < 0 ? (
              <Alert variant="warning">The saved answer doesn&rsquo;t match any option — edit to choose one.</Alert>
            ) : null}
            {question.explanation ? (
              <p className="text-xs text-[var(--muted-strong)]">Explanation: {question.explanation}</p>
            ) : null}
          </div>
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => setEditing(true)}>
            <PencilLine className="size-3.5" aria-hidden />
            Edit
          </Button>
        </div>
      )}
    </li>
  );
}

function QuestionForm({
  examId,
  question,
  index,
  onDone,
}: {
  examId: string;
  question: AdminExamQuestion;
  index: number;
  onDone: () => void;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState(question.questionText);
  const [options, setOptions] = useState<string[]>(
    OPTION_LABELS.map((_, i) => question.options[i] ?? ''),
  );
  const [correctIndex, setCorrectIndex] = useState(question.correctOptionIndex);
  const [explanation, setExplanation] = useState(question.explanation ?? '');
  const [error, setError] = useState<string | null>(null);

  const trimmed = options.map((o) => o.trim());
  const duplicate = new Set(trimmed).size !== trimmed.length;
  const valid = text.trim() && trimmed.every(Boolean) && !duplicate && correctIndex >= 0;

  const save = useMutation({
    mutationFn: () =>
      updateAdminExamQuestion(examId, question.id, {
        questionText: text.trim(),
        options: trimmed,
        correctOptionIndex: correctIndex,
        explanation: explanation.trim() || null,
      }),
    onSuccess: async (updated) => {
      qc.setQueryData<AdminExamDetail>(['admin-exam', examId], (prev) =>
        prev ? { ...prev, questions: prev.questions.map((q) => (q.id === updated.id ? updated : q)) } : prev,
      );
      await revalidateExamsCache();
      onDone();
    },
    onError: (err) => setError(messageOf(err, 'Could not save the question')),
  });

  const groupName = `correct-${question.id}`;
  return (
    <form
      className="space-y-4"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field>
        <Label htmlFor={`q-text-${question.id}`}>Question {index + 1}</Label>
        <Textarea id={`q-text-${question.id}`} value={text} onChange={(e) => setText(e.target.value)} rows={2} required />
      </Field>
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-medium text-[var(--ink)]">Options — select the correct one</legend>
        {OPTION_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <input
              type="radio"
              name={groupName}
              id={`${groupName}-${i}`}
              className="size-4 shrink-0 accent-[var(--accent)]"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
              aria-label={`Option ${label} is correct`}
            />
            <label htmlFor={`q-opt-${question.id}-${i}`} className="w-5 shrink-0 text-sm font-semibold text-[var(--ink)]">
              {label}
            </label>
            <Input
              id={`q-opt-${question.id}-${i}`}
              value={options[i]}
              onChange={(e) => setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
              required
            />
          </div>
        ))}
        {duplicate ? <FieldHint className="text-xs text-[var(--highlight)]">Options must all be different.</FieldHint> : null}
      </fieldset>
      <Field>
        <Label htmlFor={`q-exp-${question.id}`}>Explanation (optional)</Label>
        <Textarea id={`q-exp-${question.id}`} value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={2} />
      </Field>
      {error ? <Alert variant="danger">{error}</Alert> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" loading={save.isPending} disabled={!valid || save.isPending}>
          Save question
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone} disabled={save.isPending}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
