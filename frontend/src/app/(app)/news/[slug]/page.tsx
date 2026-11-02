'use client';

import Link from 'next/link';
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
  documents: Array<{
    id: string;
    title: string;
    description?: string | null;
    visibility: string;
  }>;
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
      <Link href="/news" className="text-sm text-[var(--muted)] hover:text-[var(--ink)]">
        ← News
      </Link>
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
          <h2 className="font-semibold">Attached PDFs</h2>
          <ul className="mt-3 space-y-2">
            {data.documents.map((doc) => (
              <li key={doc.id}>
                <Link
                  href={`/documents/${doc.id}`}
                  className="text-sm font-semibold underline-offset-2 hover:underline"
                >
                  {doc.title}
                </Link>
                {doc.visibility === 'PREMIUM' ? (
                  <span className="ml-2 text-xs text-[var(--muted)]">Premium</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--muted)]">
            Sign in to open authenticated PDFs. Downloads use short-lived signed URLs when Cloudinary
            is configured.
          </p>
        </Surface>
      ) : null}
    </article>
  );
}
