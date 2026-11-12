'use client';

import Link from 'next/link';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminFormPanel, AdminPage, AdminSection } from '@/components/admin/admin-page';
import { AdminListCard } from '@/components/admin/admin-list-card';
import { AdminPublishedFlag } from '@/components/admin/admin-status';
import { AdminRowActions } from '@/components/admin/admin-row-actions';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminNewsItem } from '@/lib/api/admin-types';
import { AdminNewsPageSkeleton } from '@/components/skeletons';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { useCursorList } from '@/lib/hooks/use-cursor-list';
import { ContentIn } from '@/components/ui/skeleton';

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

  const list = useCursorList<AdminNewsItem>(['admin-news'], (cursor) => {
    const qs = new URLSearchParams({ limit: '30' });
    if (cursor) qs.set('cursor', cursor);
    return `/admin/news?${qs}`;
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
    <AdminPage dense>
      <PageHeader
        eyebrow="Content"
        title="News"
        description="Draft articles for the public feed, then publish when the copy is ready."
      />

      <AdminFormPanel
        title="New article"
        description="Create a draft first — you can edit and publish from the list below."
        footer={
          <Button type="submit" form="admin-news-create" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create draft'}
          </Button>
        }
      >
        <form
          id="admin-news-create"
          className="space-y-4"
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
                placeholder="Exam tip of the week"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="exam-tip-of-the-week"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One-line teaser for the feed"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="body">Body</Label>
            <Textarea
              id="body"
              required
              className="min-h-40"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Full article content…"
            />
          </div>
          {error ? <Alert variant="danger">{error}</Alert> : null}
        </form>
      </AdminFormPanel>

      <AdminSection title="Articles" description="Edit, publish, or remove drafts and live posts.">
        {list.isLoading ? <AdminNewsPageSkeleton omitHeader /> : null}
        {!list.isLoading && list.items.length === 0 ? (
          <EmptyState title="No articles yet" description="Create a draft above to get started." />
        ) : null}

        {!list.isLoading && list.items.length > 0 ? (
          <ContentIn className="space-y-3">
            {list.items.map((item) => (
              <AdminListCard
                key={item.id}
                badges={<AdminPublishedFlag published={item.isPublished} />}
                title={
                  <Link href={`/admin/news/${item.id}`} className="hover:underline">
                    {item.title}
                  </Link>
                }
                meta={
                  <>
                    /{item.slug}
                    {item.summary ? ` · ${item.summary}` : ''}
                  </>
                }
                actions={
                  <AdminRowActions
                    primary={
                      <>
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
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => publish.mutate(item.id)}
                          >
                            Publish
                          </Button>
                        )}
                      </>
                    }
                  >
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      confirmTitle="Delete this article?"
                      confirmMessage="Soft-delete this article? It can be restored only via database."
                      confirmLabel="Delete"
                      reversible={false}
                      onConfirm={() => remove.mutateAsync(item.id)}
                    >
                      Delete
                    </ConfirmButton>
                  </AdminRowActions>
                }
              />
            ))}
            <LoadMoreButton
              hasNextPage={list.hasNextPage}
              isFetchingNextPage={list.isFetchingNextPage}
              onLoadMore={() => void list.fetchNextPage()}
            />
          </ContentIn>
        ) : null}
      </AdminSection>
    </AdminPage>
  );
}
