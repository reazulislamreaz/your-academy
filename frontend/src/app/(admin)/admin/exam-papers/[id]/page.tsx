'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import {
  ExamPaperForm,
  toExamPaperPayload,
  type ExamPaperFormValues,
} from '@/features/admin/exam-paper-form';
import { ApiError, apiFetch, apiFetchResult } from '@/lib/api/client';
import type { AdminExamPaperDetail } from '@/lib/api/admin-types';
import type { QuestionListItem } from '@/lib/api/types';

type Attached = {
  id: string;
  title: string;
  kind: string;
  difficulty: string;
};

export default function EditExamPaperPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [attached, setAttached] = useState<Attached[]>([]);

  const detail = useQuery({
    queryKey: ['admin-exam-paper', params.id],
    queryFn: () => apiFetch<AdminExamPaperDetail>(`/admin/exam-papers/${params.id}`),
  });

  useEffect(() => {
    if (detail.data) {
      setAttached(detail.data.questions.map((q) => ({ ...q })));
    }
  }, [detail.data]);

  const initial = useMemo<ExamPaperFormValues | null>(() => {
    const p = detail.data;
    if (!p) return null;
    return {
      title: p.title,
      slug: p.slug,
      examBody: p.examBody,
      year: p.year != null ? String(p.year) : '',
      description: p.description ?? '',
      durationMinutes: String(p.durationMinutes),
      totalMarks: p.totalMarks != null ? String(p.totalMarks) : '',
      isPublished: p.isPublished,
    };
  }, [detail.data]);

  const searchResults = useQuery({
    queryKey: ['admin-question-search', search],
    queryFn: async () => {
      const qs = new URLSearchParams({ limit: '10' });
      if (search.trim()) qs.set('q', search.trim());
      const result = await apiFetchResult<QuestionListItem[]>(`/questions?${qs}`);
      return result.data;
    },
    enabled: search.trim().length >= 2,
    retry: false,
  });

  const save = useMutation({
    mutationFn: (values: ExamPaperFormValues) =>
      apiFetch(`/admin/exam-papers/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(toExamPaperPayload(values)),
      }),
    onSuccess: () => {
      setMsg('Saved');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-exam-paper', params.id] });
      void qc.invalidateQueries({ queryKey: ['admin-exam-papers'] });
    },
    onError: (err) => {
      setMsg(null);
      setError(err instanceof ApiError ? err.message : 'Save failed');
    },
  });

  const saveQuestions = useMutation({
    mutationFn: () =>
      apiFetch<AdminExamPaperDetail>(`/admin/exam-papers/${params.id}/questions`, {
        method: 'POST',
        body: JSON.stringify({ questionIds: attached.map((q) => q.id) }),
      }),
    onSuccess: () => {
      setMsg('Questions saved');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-exam-paper', params.id] });
      void qc.invalidateQueries({ queryKey: ['admin-exam-papers'] });
    },
    onError: (err) => {
      setMsg(null);
      setError(err instanceof ApiError ? err.message : 'Failed to save questions');
    },
  });

  function move(id: string, dir: -1 | 1) {
    setAttached((prev) => {
      const idx = prev.findIndex((q) => q.id === id);
      const next = idx + dir;
      if (idx < 0 || next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  }

  if (detail.isLoading || !initial) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (detail.error || !detail.data) {
    return <Alert variant="danger">Exam paper not found.</Alert>;
  }

  const attachedIds = new Set(attached.map((q) => q.id));
  const candidates = (searchResults.data ?? []).filter((q) => !attachedIds.has(q.id));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Edit exam paper"
        description={detail.data.title}
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant={detail.data.isPublished ? 'success' : 'highlight'}>
              {detail.data.isPublished ? 'Published' : 'Draft'}
            </Badge>
            <Link href="/admin/exam-papers">
              <Button variant="ghost" size="sm">
                Back
              </Button>
            </Link>
          </div>
        }
      />

      {msg ? <Alert variant="success">{msg}</Alert> : null}

      <Surface className="p-6">
        <ExamPaperForm
          initial={initial}
          submitLabel="Save paper"
          pending={save.isPending}
          error={error}
          onSubmit={(values) => {
            setError(null);
            setMsg(null);
            save.mutate(values);
          }}
        />
      </Surface>

      <Surface className="space-y-5 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">
            Questions ({attached.length})
          </h2>
          <Button
            size="sm"
            disabled={saveQuestions.isPending}
            onClick={() => saveQuestions.mutate()}
          >
            {saveQuestions.isPending ? 'Saving…' : 'Save questions'}
          </Button>
        </div>

        <Field>
          <Label htmlFor="q-search">Add published questions — search by title</Label>
          <Input
            id="q-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type at least 2 characters to search"
          />
        </Field>
        {searchResults.data && search.trim().length >= 2 ? (
          <ul className="divide-y divide-[var(--line)] rounded-[var(--radius)] border border-[var(--line)]">
            {candidates.length === 0 ? (
              <li className="px-4 py-3 text-sm text-[var(--muted)]">
                No matching published questions.
              </li>
            ) : (
              candidates.map((q) => (
                <li
                  key={q.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0">
                    <span className="font-medium">{q.title}</span>
                    <span className="text-[var(--muted)]">
                      {' '}
                      · {q.category.name} · {q.difficulty}
                      {q.kind === 'WRITTEN' ? ' · Written' : ''}
                    </span>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      setAttached((prev) => [
                        ...prev,
                        { id: q.id, title: q.title, kind: q.kind ?? 'MCQ', difficulty: q.difficulty },
                      ])
                    }
                  >
                    Add
                  </Button>
                </li>
              ))
            )}
          </ul>
        ) : null}

        {attached.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No questions attached yet. Search above to add published questions.
          </p>
        ) : (
          <ol className="divide-y divide-[var(--line)] rounded-[var(--radius)] border border-[var(--line)]">
            {attached.map((q, i) => (
              <li key={q.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-semibold tabular-nums">{i + 1}. </span>
                  <span className="font-medium">{q.title}</span>
                  <span className="text-[var(--muted)]">
                    {' '}
                    · {q.difficulty}
                    {q.kind === 'WRITTEN' ? ' · Written' : ''}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === 0}
                    onClick={() => move(q.id, -1)}
                    aria-label={`Move ${q.title} up`}
                  >
                    <ArrowUp className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={i === attached.length - 1}
                    onClick={() => move(q.id, 1)}
                    aria-label={`Move ${q.title} down`}
                  >
                    <ArrowDown className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAttached((prev) => prev.filter((row) => row.id !== q.id))}
                    aria-label={`Remove ${q.title}`}
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </Button>
                </span>
              </li>
            ))}
          </ol>
        )}
        <p className="text-xs text-[var(--muted)]">
          Order is the exam order. Press “Save questions” to apply adds, removals, and reordering.
        </p>
      </Surface>
    </div>
  );
}
