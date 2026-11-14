'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { ExternalLink, Pencil, Replace } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '@/components/ui/confirm-button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ContentIn } from '@/components/ui/skeleton';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminDocumentItem } from '@/lib/api/admin-types';
import type { CategoryNode } from '@/lib/api/types';
import { getStorageStatus, uploadViaSignedRequest } from '@/lib/cloudinary-upload';
import { AdminDocumentsPageSkeleton } from '@/components/skeletons';
import { useCursorList } from '@/lib/hooks/use-cursor-list';
import { AdminFormPanel, AdminPage, AdminSection } from '@/components/admin/admin-page';
import { AdminListCard } from '@/components/admin/admin-list-card';
import { AdminRowActions } from '@/components/admin/admin-row-actions';
import { AdminPublishedFlag } from '@/components/admin/admin-status';

type EditState = {
  id: string;
  title: string;
  description: string;
  categoryId: string;
  file: File | null;
};

export default function AdminDocumentsPage() {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [publishNow, setPublishNow] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [edit, setEdit] = useState<EditState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const storage = useQuery({
    queryKey: ['storage-status'],
    queryFn: getStorageStatus,
  });

  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
  });

  const list = useCursorList<AdminDocumentItem>(['admin-documents'], (cursor) => {
    const qs = new URLSearchParams({ limit: '30' });
    if (cursor) qs.set('cursor', cursor);
    return `/admin/documents?${qs}`;
  });

  const invalidateDocs = () => {
    void qc.invalidateQueries({ queryKey: ['admin-documents'] });
    void qc.invalidateQueries({ queryKey: ['documents'] });
    void qc.invalidateQueries({ queryKey: ['public-documents'] });
  };

  const create = useMutation({
    mutationFn: async () => {
      if (storage.data?.configured && !file) {
        throw new Error('Select a PDF file to upload.');
      }
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
          visibility: 'PUBLIC',
        }),
      });
    },
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setFile(null);
      setCategoryId('');
      setMsg(
        storage.data?.configured
          ? 'Document created — published PUBLIC docs appear on পত্রিকার গুরুত্বপূর্ণ কলাম.'
          : 'Document created (metadata/placeholder — configure Cloudinary for real PDFs).',
      );
      setError(null);
      invalidateDocs();
    },
    onError: (err) => {
      setMsg(null);
      setError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Create failed',
      );
    },
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      if (!edit) return;
      let mediaAssetId: string | undefined;
      if (edit.file) {
        if (!storage.data?.configured) {
          throw new Error('Cloudinary is not configured — cannot replace PDF.');
        }
        const media = await uploadViaSignedRequest('pdf', edit.file);
        mediaAssetId = media.id;
      }
      return apiFetch(`/admin/documents/${edit.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: edit.title.trim(),
          description: edit.description || null,
          categoryId: edit.categoryId || null,
          ...(mediaAssetId ? { mediaAssetId } : {}),
        }),
      });
    },
    onSuccess: () => {
      setEdit(null);
      setEditError(null);
      setMsg('Document updated.');
      invalidateDocs();
    },
    onError: (err) => {
      setEditError(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Update failed',
      );
    },
  });

  const togglePublish = useMutation({
    mutationFn: (item: AdminDocumentItem) =>
      apiFetch(`/admin/documents/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !item.isPublished }),
      }),
    onSuccess: () => invalidateDocs(),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/admin/documents/${id}`, { method: 'DELETE' }),
    onSuccess: () => invalidateDocs(),
  });

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="Documents"
        description="Publish PDF columns for পত্রিকার গুরুত্বপূর্ণ কলাম (public). Uploads use signed Cloudinary when configured. Readers view in-app only — no download."
      />

      {storage.data ? (
        <Alert variant={storage.data.configured ? 'success' : 'info'}>
          Cloudinary:{' '}
          {storage.data.configured
            ? 'configured — PDF file upload enabled'
            : 'not configured — metadata/placeholder mode only (set real CLOUDINARY_* in .env)'}
        </Alert>
      ) : null}

      <AdminFormPanel
        title="Add document"
        description="Public published PDFs appear on the public columns page. A real PDF file is required when Cloudinary is configured."
        footer={
          <Button type="submit" form="admin-document-create" loading={create.isPending}>
            {create.isPending ? 'Creating…' : 'Create'}
          </Button>
        }
      >
        <form
          id="admin-document-create"
          className="space-y-4"
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
              <Select id="cat" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">None</option>
                {categories.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">PDF file{storage.data?.configured ? ' (required)' : ''}</Label>
              <Input
                id="file"
                type="file"
                accept="application/pdf"
                required={Boolean(storage.data?.configured)}
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
        </form>
      </AdminFormPanel>

      <AdminSection title="Library" description="Edit metadata, replace PDFs, publish, or remove.">
        {list.isLoading ? <AdminDocumentsPageSkeleton omitHeader /> : null}
        {!list.isLoading && list.items.length === 0 ? (
          <EmptyState title="No documents" description="Create an entry above." />
        ) : null}

        {!list.isLoading && list.items.length > 0 ? (
          <ContentIn className="space-y-3">
            {list.items.map((doc) => (
              <AdminListCard
                key={doc.id}
                badges={
                  <>
                    <AdminPublishedFlag published={doc.isPublished} />
                    <Badge variant={doc.visibility === 'PUBLIC' ? 'success' : 'outline'}>
                      {doc.visibility}
                    </Badge>
                  </>
                }
                title={doc.title}
                meta={
                  <>
                    {doc.mediaAsset?.originalFilename ?? 'file'}
                    {doc.mediaAsset?.bytes
                      ? ` · ${Math.max(1, Math.round(doc.mediaAsset.bytes / 1024))} KB`
                      : ''}{' '}
                    · {doc.category?.name ?? 'Uncategorized'}
                  </>
                }
                actions={
                  <AdminRowActions
                    primary={
                      <Button size="sm" variant="outline" onClick={() => togglePublish.mutate(doc)}>
                        {doc.isPublished ? 'Unpublish' : 'Publish'}
                      </Button>
                    }
                  >
                    {doc.visibility === 'PUBLIC' && doc.isPublished ? (
                      <Link href={`/news/d/${doc.id}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="size-3.5" aria-hidden />
                          Preview
                        </Button>
                      </Link>
                    ) : null}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setEdit({
                          id: doc.id,
                          title: doc.title,
                          description: doc.description ?? '',
                          categoryId: doc.category?.id ?? '',
                          file: null,
                        })
                      }
                    >
                      <Pencil className="size-3.5" aria-hidden />
                      Edit
                    </Button>
                    {doc.visibility !== 'PUBLIC' ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          apiFetch(`/admin/documents/${doc.id}`, {
                            method: 'PATCH',
                            body: JSON.stringify({ visibility: 'PUBLIC' }),
                          }).then(() => invalidateDocs())
                        }
                      >
                        Make public
                      </Button>
                    ) : null}
                    <ConfirmButton
                      size="sm"
                      variant="ghost"
                      confirmTitle="Delete this document?"
                      confirmMessage="Soft-delete this document?"
                      confirmLabel="Delete"
                      reversible={false}
                      onConfirm={() => remove.mutateAsync(doc.id)}
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

      <FormDialog
        open={Boolean(edit)}
        title="Edit document"
        description="Update title, description, category, or replace the PDF file."
        onClose={() => {
          setEdit(null);
          setEditError(null);
        }}
        onSubmit={() => saveEdit.mutate()}
        pending={saveEdit.isPending}
        confirmLabel="Save"
        error={editError}
      >
        {edit ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                required
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={edit.description}
                onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat">Category</Label>
              <Select
                id="edit-cat"
                value={edit.categoryId}
                onChange={(e) => setEdit({ ...edit, categoryId: e.target.value })}
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
              <Label htmlFor="edit-file">
                <span className="inline-flex items-center gap-1.5">
                  <Replace className="size-3.5" aria-hidden />
                  Replace PDF (optional)
                </span>
              </Label>
              <Input
                id="edit-file"
                type="file"
                accept="application/pdf"
                onChange={(e) => setEdit({ ...edit, file: e.target.files?.[0] ?? null })}
              />
            </div>
          </div>
        ) : null}
      </FormDialog>
    </AdminPage>
  );
}
