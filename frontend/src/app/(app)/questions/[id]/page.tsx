'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { apiFetch } from '@/lib/api/client';

type QuestionDetail = {
  id: string;
  title: string;
  content: string;
  explanation?: string;
  difficulty: string;
  options: Array<{ id: string; label: string; content: string; isCorrect?: boolean }>;
  category: { name: string };
};

export default function QuestionDetailPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['question', params.id],
    queryFn: () => apiFetch<QuestionDetail>(`/questions/${params.id}`),
  });
  const { data: nav } = useQuery({
    queryKey: ['question-nav', params.id],
    queryFn: () => apiFetch<{ prevId: string | null; nextId: string | null }>(`/questions/${params.id}/navigation`),
  });
  const bookmark = useMutation({
    mutationFn: () => apiFetch('/bookmarks/questions', { method: 'POST', body: JSON.stringify({ questionId: params.id }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bookmarks'] }),
  });

  if (isLoading) return <p className="py-10">Loading…</p>;
  if (error || !data) return <p className="py-10 text-[var(--danger)]">Unable to load question.</p>;

  return (
    <article className="space-y-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">{data.category.name} · {data.difficulty}</p>
        <Button variant="ghost" onClick={() => bookmark.mutate()} disabled={bookmark.isPending}>
          Save
        </Button>
      </div>
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">{data.title}</h1>
      <p className="text-lg leading-8">{data.content}</p>
      <div className="grid gap-3">
        {data.options.map((option) => (
          <div
            key={option.id}
            className={`rounded-2xl border px-4 py-3 ${
              option.isCorrect ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--line)] bg-white'
            }`}
          >
            <span className="font-semibold">{option.label}.</span> {option.content}
          </div>
        ))}
      </div>
      {data.explanation ? (
        <div className="rounded-[24px] border border-[var(--line)] bg-white p-5">
          <h2 className="font-semibold">Explanation</h2>
          <p className="mt-2 text-[var(--muted)]">{data.explanation}</p>
        </div>
      ) : (
        <p className="rounded-[24px] bg-[var(--ink)] px-5 py-4 text-sm text-white">
          Answers and explanations unlock during your trial or with a future premium plan.
        </p>
      )}
      <div className="flex gap-3">
        {nav?.prevId && (
          <Link href={`/questions/${nav.prevId}`}>
            <Button variant="ghost">Previous</Button>
          </Link>
        )}
        {nav?.nextId && (
          <Link href={`/questions/${nav.nextId}`}>
            <Button variant="ghost">Next</Button>
          </Link>
        )}
      </div>
    </article>
  );
}
