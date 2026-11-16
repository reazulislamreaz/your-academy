'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { FileUp, Replace } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LoadMoreButton } from '@/components/ui/load-more-button';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ContentIn } from '@/components/ui/skeleton';
import { ProgressBar } from '@/components/loading/progress-bar';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { AdminDocumentItem } from '@/lib/api/admin-types';
import type { CategoryNode } from '@/lib/api/types';
import {
  getStorageStatus,
  uploadViaSignedRequest,
  type UploadProgress,
} from '@/lib/cloudinary-upload';
import { AdminDocumentsPageSkeleton } from '@/components/skeletons';
import { useCursorList } from '@/lib/hooks/use-cursor-list';
import {
  AdminFormPanel,
  AdminListMeta,
  AdminPage,
  AdminSection,
} from '@/components/admin/admin-page';
import { DocumentLibraryCard } from '@/features/admin/documents/document-library-card';

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
  const [createProgress, setCreateProgress] = useState<UploadProgress | null>(null);
  const [editProgress, setEditProgress] = useState<UploadProgress | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

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

  const publishedCount = useMemo(
    () => list.items.filter((d) => d.isPublished).length,
    [list.items],
  );

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
        setCreateProgress({ phase: 'signing', percent: 0 });
        const media = await uploadViaSignedRequest('pdf', file, {
          onProgress: setCreateProgress,
        });
        mediaAssetId = media.id;
      }
      setCreateProgress({ phase: 'confirming', percent: 98 });
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
      setCreateProgress(null);
      setMsg(
        storage.data?.configured
          ? 'Document uploaded. Published public PDFs appear on পত্রিকার গুরুত্বপূর্ণ কলাম.'
          : 'Document created (metadata/placeholder — configure Cloudinary for real PDFs).',
      );
      setError(null);
      invalidateDocs();
    },
    onError: (err) => {
      setCreateProgress(null);
      setMsg(null);
      setError(errMessage(err, 'Create failed'));
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
        setEditProgress({ phase: 'signing', percent: 0 });
        const media = await uploadViaSignedRequest('pdf', edit.file, {
          onProgress: setEditProgress,
        });
        mediaAssetId = media.id;
        setEditProgress({ phase: 'confirming', percent: 98 });
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
      setEditProgress(null);
      setMsg('Document updated.');
      invalidateDocs();
    },
    onError: (err) => {
      setEditProgress(null);
      setEditError(errMessage(err, 'Update failed'));
    },
  });

  const togglePublish = useMutation({
    mutationFn: async (item: AdminDocumentItem) => {
      setBusyId(item.id);
      await apiFetch(`/admin/documents/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isPublished: !item.isPublished }),
      });
      return item;
    },
    onSuccess: (item) => {
      setBusyId(null);
      setMsg(item.isPublished ? 'Document unpublished.' : 'Document published.');
      setError(null);
      invalidateDocs();
    },
    onError: (err) => {
      setBusyId(null);
      setMsg(null);
      setError(errMessage(err, 'Could not update publish state'));
    },
  });

  const makePublic = useMutation({
    mutationFn: async (item: AdminDocumentItem) => {
      setBusyId(item.id);
      await apiFetch(`/admin/documents/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility: 'PUBLIC' }),
      });
    },
    onSuccess: () => {
      setBusyId(null);
      setMsg('Document is now public.');
      setError(null);
      invalidateDocs();
    },
    onError: (err) => {
      setBusyId(null);
      setMsg(null);
      setError(errMessage(err, 'Could not update visibility'));
    },
  });

  const remove = useMutation({
    mutationFn: async (item: AdminDocumentItem) => {
      setBusyId(item.id);
      await apiFetch(`/admin/documents/${item.id}`, { method: 'DELETE' });
      return item;
    },
    onSuccess: (item) => {
      setBusyId(null);
      setMsg(`Deleted “${item.title}”.`);
      setError(null);
      invalidateDocs();
    },
    onError: (err) => {
      setBusyId(null);
      setMsg(null);
      setError(errMessage(err, 'Delete failed'));
    },
  });

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Content"
        title="Documents"
        description="Upload and manage PDF columns for পত্রিকার গুরুত্বপূর্ণ কলাম. Readers open files in-app — downloads stay disabled."
      />

      {storage.data ? (
        <Alert variant={storage.data.configured ? 'success' : 'info'}>
          {storage.data.configured
            ? 'Cloudinary is configured — PDF uploads are enabled.'
            : 'Cloudinary is not configured — you can save metadata only until CLOUDINARY_* credentials are set.'}
        </Alert>
      ) : null}

      {(error || msg) && !create.isPending ? (
        <Alert variant={error ? 'danger' : 'success'}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <p className="min-w-0 flex-1">{error ?? msg}</p>
            <button
              type="button"
              className="shrink-0 text-xs font-semibold underline-offset-2 hover:underline"
              onClick={() => {
                setError(null);
                setMsg(null);
              }}
            >
              Dismiss
            </button>
          </div>
        </Alert>
      ) : null}

      <AdminFormPanel
        title="Upload document"
        description="Add a title, optional details, and a PDF. Public + published documents appear on the marketing columns page."
        footer={
          <Button type="submit" form="admin-document-create" loading={create.isPending}>
            {create.isPending
              ? createProgress
                ? uploadProgressLabel(createProgress)
                : 'Uploading…'
              : 'Upload document'}
          </Button>
        }
      >
        <form
          id="admin-document-create"
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setMsg(null);
            create.mutate();
          }}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. BCS Preliminary current affairs"
                  disabled={create.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short summary for admins and library cards"
                  disabled={create.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat">Category</Label>
                <Select
                  id="cat"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={create.isPending}
                >
                  <option value="">None</option>
                  {categories.data?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="file">
                  PDF file{storage.data?.configured ? ' (required)' : ''}
                </Label>
                <label
                  htmlFor="file"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--line-strong)] bg-[var(--bg-desk)]/60 px-4 py-8 text-center transition-colors hover:border-[var(--accent)]/40 hover:bg-[var(--bg-desk)]"
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-[var(--highlight-soft)] text-[var(--highlight)]">
                    <FileUp className="size-5" aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-[var(--ink)]">
                    {file ? file.name : 'Choose a PDF to upload'}
                  </span>
                  <span className="text-xs text-[var(--muted-strong)]">
                    {file
                      ? formatBytes(file.size)
                      : storage.data?.configured
                        ? 'Up to 40 MB · application/pdf'
                        : 'Optional until Cloudinary is configured'}
                  </span>
                  <input
                    id="file"
                    type="file"
                    accept="application/pdf"
                    required={Boolean(storage.data?.configured)}
                    disabled={create.isPending}
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
              </div>
              <label className="flex items-start gap-2.5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 text-sm">
                <input
                  type="checkbox"
                  className="admin-checkbox mt-0.5"
                  checked={publishNow}
                  disabled={create.isPending}
                  onChange={(e) => setPublishNow(e.target.checked)}
                />
                <span>
                  <span className="font-semibold text-[var(--ink)]">Publish immediately</span>
                  <span className="mt-0.5 block text-xs text-[var(--muted-strong)]">
                    Leave unchecked to save as draft. Visibility defaults to Public.
                  </span>
                </span>
              </label>
            </div>
          </div>

          {create.isPending && createProgress ? (
            <div className="space-y-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-desk)]/50 p-3">
              <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted-strong)]">
                <span>{uploadProgressLabel(createProgress)}</span>
                <span className="tabular-nums">{Math.round(createProgress.percent)}%</span>
              </div>
              <ProgressBar value={createProgress.percent} label="PDF upload progress" />
            </div>
          ) : null}

          {error && create.isPending ? <Alert variant="danger">{error}</Alert> : null}
        </form>
      </AdminFormPanel>

      <AdminSection
        title="Document library"
        description="Edit details, replace PDFs, publish, preview, or delete. Actions stay on each card."
        actions={
          !list.isLoading && list.items.length > 0 ? (
            <AdminListMeta
              count={list.items.length}
              noun="document"
              hasMore={list.hasNextPage}
            />
          ) : null
        }
      >
        {list.isLoading ? <AdminDocumentsPageSkeleton omitHeader /> : null}

        {!list.isLoading && list.items.length === 0 ? (
          <EmptyState
            align="center"
            title="No documents yet"
            description="Upload your first PDF above. Published public documents will appear on the columns page for readers."
          />
        ) : null}

        {!list.isLoading && list.items.length > 0 ? (
          <ContentIn className="space-y-3">
            <p className="text-sm text-[var(--muted-strong)]">
              <span className="font-semibold tabular-nums text-[var(--ink-soft)]">
                {publishedCount}
              </span>{' '}
              published
              {list.hasNextPage ? ' in this page' : ''} · manage each card below
            </p>
            {list.items.map((doc) => (
              <DocumentLibraryCard
                key={doc.id}
                doc={doc}
                busy={busyId === doc.id}
                onEdit={(item) =>
                  setEdit({
                    id: item.id,
                    title: item.title,
                    description: item.description ?? '',
                    categoryId: item.category?.id ?? '',
                    file: null,
                  })
                }
                onTogglePublish={(item) => togglePublish.mutate(item)}
                onMakePublic={(item) => makePublic.mutate(item)}
                onDelete={(item) => remove.mutateAsync(item)}
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
          if (saveEdit.isPending) return;
          setEdit(null);
          setEditError(null);
          setEditProgress(null);
        }}
        onSubmit={() => saveEdit.mutate()}
        pending={saveEdit.isPending}
        confirmLabel={saveEdit.isPending && editProgress ? uploadProgressLabel(editProgress) : 'Save changes'}
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
                disabled={saveEdit.isPending}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={edit.description}
                disabled={saveEdit.isPending}
                onChange={(e) => setEdit({ ...edit, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-cat">Category</Label>
              <Select
                id="edit-cat"
                value={edit.categoryId}
                disabled={saveEdit.isPending}
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
                disabled={saveEdit.isPending}
                onChange={(e) => setEdit({ ...edit, file: e.target.files?.[0] ?? null })}
              />
              {edit.file ? (
                <p className="text-xs text-[var(--muted-strong)]">
                  Selected: {edit.file.name} · {formatBytes(edit.file.size)}
                </p>
              ) : null}
            </div>
            {saveEdit.isPending && editProgress ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3 text-xs text-[var(--muted-strong)]">
                  <span>{uploadProgressLabel(editProgress)}</span>
                  <span className="tabular-nums">{Math.round(editProgress.percent)}%</span>
                </div>
                <ProgressBar value={editProgress.percent} label="PDF replace progress" />
              </div>
            ) : null}
          </div>
        ) : null}
      </FormDialog>
    </AdminPage>
  );
}

function errMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return fallback;
}

function uploadProgressLabel(progress: UploadProgress): string {
  if (progress.phase === 'signing') return 'Preparing upload…';
  if (progress.phase === 'uploading') {
    if (progress.loaded != null && progress.total) {
      return `Uploading ${formatBytes(progress.loaded)} / ${formatBytes(progress.total)}`;
    }
    return 'Uploading PDF…';
  }
  return 'Saving document…';
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
