'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (error || !data) return <Alert variant="danger">Article not found.</Alert>;

  return (
    <article className="space-y-5">
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{data.title}</h1>
      {data.publishedAt ? (
        <p className="text-sm text-[var(--muted)]">
          {new Date(data.publishedAt).toLocaleDateString()}
        </p>
      ) : null}
      <p className="font-reading whitespace-pre-wrap text-lg leading-relaxed text-[var(--ink-soft)]">
        {data.body}
      </p>
      {data.documents.length > 0 ? (
        <Surface className="p-4">
          <h2 className="font-semibold">Attachments</h2>
          <ul className="mt-2 space-y-1 text-sm text-[var(--muted-strong)]">
            {data.documents.map((d) => (
              <li key={d.document.id}>{d.document.title}</li>
            ))}
          </ul>
        </Surface>
      ) : null}
    </article>
  );
}
