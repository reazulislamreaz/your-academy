'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';
import { apiFetch } from '@/lib/api/client';

type Category = {
  id: string;
  name: string;
  children: Array<{ id: string; name: string }>;
};

type AdminQuestion = {
  id: string;
  title: string;
  status: string;
};

const selectClass =
  'h-11 w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3.5 text-sm outline-none focus:border-[var(--ink)] focus:shadow-[0_0_0_3px_var(--highlight-soft)]';

export default function AdminQuestionsPage() {
  const qc = useQueryClient();
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<Category[]>('/categories'),
  });
  const questions = useQuery({
    queryKey: ['admin-questions'],
    queryFn: () => apiFetch<AdminQuestion[]>('/admin/questions'),
  });

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [explanation, setExplanation] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [correct, setCorrect] = useState('A');
  const [options, setOptions] = useState(['', '', '', '']);

  const create = useMutation({
    mutationFn: async () => {
      const labels = ['A', 'B', 'C', 'D'];
      const created = await apiFetch<{ id: string }>('/admin/questions', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content,
          explanation,
          categoryId,
          subcategoryId: subcategoryId || undefined,
          difficulty: 'MEDIUM',
          options: options.map((text, i) => ({
            label: labels[i],
            content: text,
            isCorrect: labels[i] === correct,
          })),
        }),
      });
      await apiFetch(`/admin/questions/${created.id}/publish`, { method: 'POST' });
      return created;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-questions'] });
      qc.invalidateQueries({ queryKey: ['questions'] });
      setTitle('');
      setContent('');
      setExplanation('');
      setOptions(['', '', '', '']);
    },
  });

  const selected = categories.data?.find((c) => c.id === categoryId);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Questions"
        description="Create a draft set of options and publish immediately (edit/archive UI arrives in Phase 5)."
      />

      <Surface className="p-6">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="q-title">Title</Label>
            <Input id="q-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-content">Question</Label>
            <Textarea
              id="q-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-explanation">Explanation</Label>
            <Textarea
              id="q-explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="q-category">Category</Label>
              <select
                id="q-category"
                className={selectClass}
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setSubcategoryId('');
                }}
                required
              >
                <option value="">Select category</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-sub">Subcategory</Label>
              <select
                id="q-sub"
                className={selectClass}
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
              >
                <option value="">Optional</option>
                {selected?.children.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((opt, i) => (
              <div key={i} className="space-y-2">
                <Label htmlFor={`opt-${i}`}>Option {['A', 'B', 'C', 'D'][i]}</Label>
                <Input
                  id={`opt-${i}`}
                  value={opt}
                  onChange={(e) =>
                    setOptions((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))
                  }
                  required
                />
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <Label htmlFor="correct">Correct option</Label>
            <select
              id="correct"
              className={selectClass}
              value={correct}
              onChange={(e) => setCorrect(e.target.value)}
            >
              {['A', 'B', 'C', 'D'].map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Publishing…' : 'Create & publish'}
          </Button>
          {create.isError ? <Alert variant="danger">Failed to create question.</Alert> : null}
          {create.isSuccess ? <Alert variant="success">Question published.</Alert> : null}
        </form>
      </Surface>

      <div className="space-y-3">
        <h2 className="font-display text-xl font-semibold">Existing</h2>
        <div className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
          {questions.data?.map((q) => (
            <div key={q.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="font-medium">{q.title}</span>
              <Badge variant={q.status === 'PUBLISHED' ? 'success' : 'outline'}>{q.status}</Badge>
            </div>
          ))}
          {questions.data?.length === 0 ? (
            <p className="px-4 py-6 text-sm text-[var(--muted)]">No questions yet.</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
