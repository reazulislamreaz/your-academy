'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Alert } from '@/components/ui/alert';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';
import { NewsDetailPageSkeleton } from '@/components/skeletons';

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
    return <NewsDetailPageSkeleton />;
  }
  if (error || !data) return <Alert variant="danger">Article not found.</Alert>;

  return (
    <article className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/news" className="text-sm text-[var(--muted-strong)] hover:text-[var(--highlight)]">
        ← News
      </Link>
      <header className="space-y-3 border-b border-[var(--line)] pb-6">
        <h1 className="font-display text-[clamp(1.75rem,3.5vw,2.5rem)] font-bold tracking-tight">
          {data.title}
        </h1>
        {data.publishedAt ? (
          <p className="text-sm text-[var(--muted-strong)]">
            {new Date(data.publishedAt).toLocaleDateString()}
          </p>
        ) : null}
      </header>
      <p className="font-reading whitespace-pre-wrap break-words text-lg leading-relaxed text-[var(--ink-soft)]">
        {data.body}
      </p>
      {data.documents.length > 0 ? (
        <Surface elevated className="p-5">
          <h2 className="text-xs font-semibold tracking-[0.14em] text-[var(--muted-strong)] uppercase">
            Attached PDFs
          </h2>
          <ul className="mt-4 divide-y divide-[var(--line)]">
            {data.documents.map((doc) => (
              <li key={doc.id} className="py-3 first:pt-0 last:pb-0">
                <Link
                  href={`/documents/${doc.id}`}
                  className="text-sm font-semibold underline-offset-2 hover:underline"
                >
                  {doc.title}
                </Link>
                {doc.visibility === 'PREMIUM' ? (
                  <span className="ml-2 text-xs text-[var(--muted-strong)]">Premium</span>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-[var(--muted-strong)]">
            Sign in to open authenticated PDFs. Downloads use short-lived signed URLs when Cloudinary
            is configured.
          </p>
        </Surface>
      ) : null}
    </article>
  );
}
