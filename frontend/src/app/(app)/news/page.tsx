'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

type NewsItem = { id: string; title: string; slug: string; summary?: string | null; publishedAt?: string };

export default function NewsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: () => apiFetch<NewsItem[]>('/news'),
  });

  return (
    <div className="space-y-6 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">News</h1>
      {isLoading && <p>Loading…</p>}
      <div className="grid gap-4">
        {data?.map((item) => (
          <Link key={item.id} href={`/news/${item.slug}`} className="rounded-[24px] border border-[var(--line)] bg-white p-5">
            <h2 className="text-xl font-semibold">{item.title}</h2>
            {item.summary && <p className="mt-2 text-[var(--muted)]">{item.summary}</p>}
          </Link>
        ))}
        {data?.length === 0 && <p className="text-[var(--muted)]">No published articles yet.</p>}
      </div>
    </div>
  );
}
