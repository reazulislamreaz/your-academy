'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

type BookmarkRow = {
  id: string;
  question: { id: string; title: string; difficulty: string; category: { name: string } };
};

export default function BookmarksPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['bookmarks'],
    queryFn: () => apiFetch<BookmarkRow[]>('/bookmarks/questions'),
  });

  return (
    <div className="space-y-6 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">Saved questions</h1>
      {isLoading && <p>Loading…</p>}
      {error && <p className="text-[var(--danger)]">Sign in to view bookmarks.</p>}
      <div className="grid gap-3">
        {data?.map((b) => (
          <Link key={b.id} href={`/questions/${b.question.id}`} className="rounded-2xl border border-[var(--line)] bg-white p-4">
            <p className="font-semibold">{b.question.title}</p>
            <p className="text-sm text-[var(--muted)]">
              {b.question.category.name} · {b.question.difficulty}
            </p>
          </Link>
        ))}
        {data?.length === 0 && <p className="text-[var(--muted)]">No bookmarks yet.</p>}
      </div>
    </div>
  );
}
