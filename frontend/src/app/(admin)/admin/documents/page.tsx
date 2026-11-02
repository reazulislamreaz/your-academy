'use client';

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
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Surface } from '@/components/ui/surface';
import { Textarea } from '@/components/ui/textarea';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminDocumentItem } from '@/lib/api/admin-types';
import type { CategoryNode } from '@/lib/api/types';
import { getStorageStatus, uploadViaSignedRequest } from '@/lib/cloudinary-upload';

export default function AdminDocumentsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const storage = useQuery({
    queryKey: ['storage-status'],
    queryFn: getStorageStatus,
  });

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const list = useQuery({
    queryKey: ['admin-documents'],
    queryFn: () => apiFetch<AdminDocumentItem[]>('/admin/documents'),
  });

  const create = useMutation({
    mutationFn: async () => {
      let mediaAssetId: string | undefined;
      if (storage.data?.configured && file) {
        const media = await uploadViaSignedRequest('pdf', file);
        mediaAssetId = media.id;
      }
      return apiFetch('/admin/documents', {
        method: 'POST',
        body: JSON.stringify({
          title,
          description: description || undefined,
          categoryId: categoryId || undefined,
          filename: file?.name,
          mediaAssetId,
          isPublished: publishNow,
          visibility: 'AUTHENTICATED',
        }),
      });
    },
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setFile(null);
      setCategoryId('');
      setMsg(
        storage.data?.configured && file
          ? 'Document created with Cloudinary asset.'
          : 'Document created (metadata/placeholder — configure Cloudinary for real PDFs).',
      );
      setError(null);
      void qc.invalidateQueries({ queryKey: ['admin-documents'] });
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => {
      setMsg(null);
      setError(err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Create failed');
    },
  });

  const togglePublish = useMutation({
    mutationFn: (item: AdminDocumentItem) =>
      apiFetch(`/admin/documents/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !item.isPublished }),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-documents'] });
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-documents'] });
      void qc.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Content"
        title="Documents"
        description="Publish PDF library entries. Uploads use signed Cloudinary requests when configured."
      />

      {storage.data ? (
        <Alert variant={storage.data.configured ? 'success' : 'info'}>
          Cloudinary:{' '}
          {storage.data.configured
            ? 'configured — PDF file upload enabled'
            : 'not configured — metadata/placeholder mode only (set real CLOUDINARY_* in .env)'}
        </Alert>
      ) : null}

      <Surface className="p-6">
        <h2 className="font-display text-lg font-semibold">Add document</h2>
        <form
          className="mt-4 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" required value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <Textarea
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="cat">Category</Label>
              <Select
                id="cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">None</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">PDF file</Label>
              <Input
                id="file"
                type="file"
                accept="application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={(e) => setPublishNow(e.target.checked)}
            />
            Publish immediately
          </label>
          {error ? <Alert variant="danger">{error}</Alert> : null}
          {msg ? <Alert variant="success">{msg}</Alert> : null}
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        </form>
      </Surface>

      {list.isLoading ? <Skeleton className="h-32 w-full" /> : null}
      {!list.isLoading && (list.data?.length ?? 0) === 0 ? (
        <EmptyState title="No documents" description="Create an entry above." />
      ) : null}

      <ul className="divide-y divide-[var(--line)] overflow-hidden rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)]">
        {list.data?.map((doc) => (
          <li
            key={doc.id}
            className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-semibold">{doc.title}</p>
              <p className="text-sm text-[var(--muted)]">
                {doc.mediaAsset?.originalFilename ?? 'file'} ·{' '}
                {doc.category?.name ?? 'Uncategorized'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={doc.isPublished ? 'success' : 'outline'}>
                {doc.isPublished ? 'Published' : 'Draft'}
              </Badge>
              <Button size="sm" variant="outline" onClick={() => togglePublish.mutate(doc)}>
                {doc.isPublished ? 'Unpublish' : 'Publish'}
              </Button>
              <ConfirmButton
                size="sm"
                variant="ghost"
                confirmMessage="Soft-delete this document?"
                onConfirm={() => remove.mutateAsync(doc.id)}
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
