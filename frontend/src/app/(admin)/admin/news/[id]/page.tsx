'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { AdminFormPanel, AdminPage } from '@/components/admin/admin-page';
import { AdminPublishedFlag } from '@/components/admin/admin-status';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminDocumentItem, AdminNewsDetail } from '@/lib/api/admin-types';
import { cn } from '@/lib/utils';
import { AdminNewsEditPageSkeleton } from '@/components/skeletons';

export default function EditNewsPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [documentIds, setDocumentIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['admin-news', params.id],
    queryFn: () => apiFetch<AdminNewsDetail>(`/admin/news/${params.id}`),
  });

  const documents = useQuery({
    queryKey: ['admin-documents'],
    queryFn: () => apiFetch<AdminDocumentItem[]>('/admin/documents'),
  });

  useEffect(() => {
    if (!detail.data) return;
    setTitle(detail.data.title);
    setSlug(detail.data.slug);
    setSummary(detail.data.summary ?? '');
    setBody(detail.data.body);
    setDocumentIds(detail.data.documentIds ?? detail.data.documents?.map((d) => d.id) ?? []);
  }, [detail.data]);

  const save = useMutation({
    mutationFn: () =>
      apiFetch(`/admin/news/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title,
          slug,
          summary: summary || null,
          body,
          documentIds,
        }),
      }),
    onSuccess: () => {
      setMsg('Saved');
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-news'] });
      void qc.invalidateQueries({ queryKey: ['admin-news', params.id] });
      void qc.invalidateQueries({ queryKey: ['news'] });
    },
    onError: (err) => {
      setMsg(null);
      setError(err instanceof ApiError ? err.message : 'Save failed');
    },
  });

  const publish = useMutation({
    mutationFn: () => apiFetch(`/admin/news/${params.id}/publish`, { method: 'POST' }),
    onSuccess: () => {
      setMsg('Published');
      void qc.invalidateQueries({ queryKey: ['admin-news', params.id] });
      void qc.invalidateQueries({ queryKey: ['admin-news'] });
      void qc.invalidateQueries({ queryKey: ['news'] });
    },
  });

  function toggleDocument(id: string) {
    setDocumentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  if (detail.isLoading) return <AdminNewsEditPageSkeleton />;
  if (detail.error || !detail.data) return <Alert variant="danger">Article not found.</Alert>;

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="Edit article"
        description={`/${detail.data.slug}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <AdminPublishedFlag published={detail.data.isPublished} />
            {!detail.data.isPublished ? (
              <Button
                size="sm"
                variant="secondary"
                disabled={publish.isPending}
                onClick={() => publish.mutate()}
              >
                {publish.isPending ? 'Publishing…' : 'Publish'}
              </Button>
            ) : null}
            <Link href="/admin/news">
              <Button size="sm" variant="ghost">
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <AdminFormPanel
        title="Article details"
        description="Update the copy, slug, and attached PDFs. Save to apply changes."
        footer={
          <Button type="submit" form="admin-news-edit" loading={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        }
      >
        <form
          id="admin-news-edit"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
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
              className="min-h-48"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="space-y-3 border-t border-[var(--line)] pt-4">
            <Label>Attached PDFs</Label>
            <p className="text-sm text-[var(--muted-strong)]">
              Select documents to show on the public article. Only published PDFs appear to
              learners.
            </p>
            {documents.isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] p-3"
                  >
                    <div className="skeleton h-3.5 w-48 rounded-md" />
                    <div className="skeleton h-8 w-20 rounded-full" />
                  </div>
                ))}
              </div>
            ) : null}
            <div className="grid max-h-64 gap-2 overflow-y-auto">
              {documents.data?.map((doc) => {
                const checked = documentIds.includes(doc.id);
                return (
                  <label
                    key={doc.id}
                    className={cn(
                      'flex cursor-pointer items-start gap-3 rounded-[var(--radius)] border p-3',
                      checked
                        ? 'border-[var(--highlight)] bg-[var(--highlight-soft)]'
                        : 'border-[var(--line)] bg-[var(--bg-elevated)]',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={checked}
                      onChange={() => toggleDocument(doc.id)}
                    />
                    <span className="min-w-0">
                      <span className="block font-medium">{doc.title}</span>
                      <span className="text-xs text-[var(--muted-strong)]">
                        {doc.isPublished ? 'Published' : 'Draft'} · {doc.visibility}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {!documents.isLoading && (documents.data?.length ?? 0) === 0 ? (
              <p className="text-sm text-[var(--muted-strong)]">
                No documents yet.{' '}
                <Link
                  href="/admin/documents"
                  className="font-semibold underline-offset-2 hover:underline"
                >
                  Create one
                </Link>
              </p>
            ) : null}
          </div>

          {msg ? <Alert variant="success">{msg}</Alert> : null}
          {error ? <Alert variant="danger">{error}</Alert> : null}
        </form>
      </AdminFormPanel>
    </AdminPage>
  );
}
