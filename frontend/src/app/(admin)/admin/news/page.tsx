'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ListRowsSkeleton } from '@/components/skeletons';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminNewsItem } from '@/lib/api/admin-types';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function AdminNewsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);

  const list = useQuery({
    queryKey: ['admin-news'],
    queryFn: () => apiFetch<AdminNewsItem[]>('/admin/news'),
  });

  const create = useMutation({
    mutationFn: () =>
      apiFetch<AdminNewsItem>('/admin/news', {
        method: 'POST',
        body: JSON.stringify({
          title,
          slug: slug || slugify(title),
          summary: summary || undefined,
          body,
        }),
      }),
    onSuccess: () => {
      setTitle('');
      setSlug('');
      setSummary('');
      setBody('');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-news'] });
      void qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (err) => setError(err instanceof ApiError ? err.message : 'Create failed'),
  });

  const publish = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/news/${id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-news'] });
      void qc.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const unpublish = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/news/${id}/unpublish`, { method: 'POST' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-news'] });
      void qc.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/news/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-news'] });
      void qc.invalidateQueries({ queryKey: ['news'] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="News"
        description="Draft and publish articles for the public news feed."
      />

      <Surface className="p-6">
        <h2 className="font-display text-lg font-semibold">New article</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slug || slug === slugify(title)) setSlug(slugify(e.target.value));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input id="slug" required value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Input id="summary" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              required
              className="min-h-40"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create draft'}
          </Button>
        </form>
      </Surface>

      {list.isLoading ? <ListRowsSkeleton rows={5} /> : null}
      {!list.isLoading && (list.data?.length ?? 0) === 0 ? (
        <EmptyState title="No articles" description="Create a draft above." />
      ) : null}

      <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
        {list.data?.map((item) => (
          <li
            key={item.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <Link href={`/admin/news/${item.id}`} className="font-semibold hover:underline">
                {item.title}
              </Link>
              <p className="text-sm break-all text-[var(--muted-strong)]">/{item.slug}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={item.isPublished ? 'success' : 'outline'}>
                {item.isPublished ? 'Published' : 'Draft'}
              </Badge>
              <Link href={`/admin/news/${item.id}`}>
                <Button size="sm" variant="outline">
                  Edit
                </Button>
              </Link>
              {item.isPublished ? (
                <Button size="sm" variant="ghost" onClick={() => unpublish.mutate(item.id)}>
                  Unpublish
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => publish.mutate(item.id)}>
                  Publish
                </Button>
              )}
              <ConfirmButton
                size="sm"
                variant="ghost"
                confirmMessage="Soft-delete this article?"
                onConfirm={() => remove.mutateAsync(item.id)}
              >
                Delete
              </ConfirmButton>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
