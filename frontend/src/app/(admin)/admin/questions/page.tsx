'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
    <div className="space-y-8 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">Manage questions</h1>
      <form
        className="space-y-4 rounded-[28px] border border-[var(--line)] bg-white p-6"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea
          className="min-h-28 w-full rounded-2xl border border-[var(--line)] px-4 py-3"
          placeholder="Question content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
        <textarea
          className="min-h-24 w-full rounded-2xl border border-[var(--line)] px-4 py-3"
          placeholder="Explanation"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <select
            className="rounded-2xl border border-[var(--line)] px-4 py-3"
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubcategoryId('');
            }}
            required
          >
            <option value="">Category</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className="rounded-2xl border border-[var(--line)] px-4 py-3"
            value={subcategoryId}
            onChange={(e) => setSubcategoryId(e.target.value)}
          >
            <option value="">Subcategory (optional)</option>
            {selected?.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        {options.map((opt, i) => (
          <Input
            key={i}
            placeholder={`Option ${['A', 'B', 'C', 'D'][i]}`}
            value={opt}
            onChange={(e) =>
              setOptions((prev) => prev.map((p, idx) => (idx === i ? e.target.value : p)))
            }
            required
          />
        ))}
        <select
          className="rounded-2xl border border-[var(--line)] px-4 py-3"
          value={correct}
          onChange={(e) => setCorrect(e.target.value)}
        >
          {['A', 'B', 'C', 'D'].map((l) => (
            <option key={l} value={l}>
              Correct: {l}
            </option>
          ))}
        </select>
        <Button disabled={create.isPending}>{create.isPending ? 'Publishing…' : 'Create & publish'}</Button>
        {create.isError && <p className="text-sm text-[var(--danger)]">Failed to create question.</p>}
      </form>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Existing</h2>
        {questions.data?.map((q) => (
          <div key={q.id} className="rounded-2xl border border-[var(--line)] bg-white px-4 py-3 text-sm">
            {q.title} · {q.status}
          </div>
        ))}
      </div>
    </div>
  );
}
