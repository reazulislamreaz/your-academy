'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

type QuestionListItem = {
  id: string;
  title: string;
  difficulty: string;
  category: { name: string };
  subcategory?: { name: string } | null;
  publishedAt?: string;
};

export default function QuestionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['questions'],
    queryFn: () => apiFetch<QuestionListItem[]>('/questions'),
  });

  return (
    <div className="space-y-6 py-8">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">Question bank</h1>
        <p className="mt-2 text-[var(--muted)]">Published MCQs, newest first.</p>
      </div>
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-[var(--danger)]">Sign in to browse questions.</p>}
      <div className="grid gap-4">
        {data?.map((q) => (
          <Link
            key={q.id}
            href={`/questions/${q.id}`}
            className="rounded-[24px] border border-[var(--line)] bg-white/80 p-5 shadow-[var(--shadow)] transition hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{q.title}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  {q.category.name}
                  {q.subcategory ? ` · ${q.subcategory.name}` : ''}
                </p>
              </div>
              <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent)]">
                {q.difficulty}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
