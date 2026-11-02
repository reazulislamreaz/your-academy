'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api/client';

type NewsDetail = {
  title: string;
  body: string;
  publishedAt?: string;
  documents: Array<{ document: { id: string; title: string } }>;
};

export default function NewsDetailPage() {
  const params = useParams<{ slug: string }>();
  const { data, isLoading, error } = useQuery({
    queryKey: ['news', params.slug],
    queryFn: () => apiFetch<NewsDetail>(`/news/${params.slug}`),
  });

  if (isLoading) return <p className="py-10">Loading…</p>;
  if (error || !data) return <p className="py-10 text-[var(--danger)]">Article not found.</p>;

  return (
    <article className="space-y-4 py-8">
      <h1 className="font-[family-name:var(--font-display)] text-4xl font-bold">{data.title}</h1>
      <p className="whitespace-pre-wrap leading-8 text-[var(--muted)]">{data.body}</p>
      {data.documents.length > 0 && (
        <div className="rounded-2xl border border-[var(--line)] bg-white p-4">
          <h2 className="font-semibold">Attachments</h2>
          <ul className="mt-2 space-y-1 text-sm">
            {data.documents.map((d) => (
              <li key={d.document.id}>{d.document.title}</li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
