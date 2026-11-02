'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminNewsDetail } from '@/lib/api/admin-types';

export default function EditNewsPage() {
  const params = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const detail = useQuery({
    queryKey: ['admin-news', params.id],
    queryFn: () => apiFetch<AdminNewsDetail>(`/admin/news/${params.id}`),
  });

  useEffect(() => {
    if (!detail.data) return;
    setTitle(detail.data.title);
    setSlug(detail.data.slug);
    setSummary(detail.data.summary ?? '');
    setBody(detail.data.body);
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

  if (detail.isLoading) return <Skeleton className="h-64 w-full" />;
  if (detail.error || !detail.data) return <Alert variant="danger">Article not found.</Alert>;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Edit article"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={detail.data.isPublished ? 'success' : 'outline'}>
              {detail.data.isPublished ? 'Published' : 'Draft'}
            </Badge>
            <Link href="/admin/news">
              <Button size="sm" variant="ghost">
                Back
              </Button>
            </Link>
          </div>
        }
      />

      {!detail.data.isPublished ? (
        <Button size="sm" variant="secondary" onClick={() => publish.mutate()}>
          Publish
        </Button>
      ) : null}

      <Surface className="p-6">
        <form
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
          {msg ? <Alert variant="success">{msg}</Alert> : null}
          {error ? <Alert variant="danger">{error}</Alert> : null}
          <Button type="submit" disabled={save.isPending}>
            {save.isPending ? 'Saving…' : 'Save changes'}
          </Button>
        </form>
      </Surface>
    </div>
  );
}
