'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Folder, FolderOpen, FolderPlus, Layers, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { BookmarkCollectionsPayload } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import type { FolderKey } from './saved-exam';

type Props = {
  collections: BookmarkCollectionsPayload | undefined;
  folder: FolderKey;
  onSelect: (folder: FolderKey) => void;
};

type Dialog =
  | { kind: 'create' }
  | { kind: 'rename'; id: string; name: string }
  | { kind: 'delete'; id: string; name: string; count: number }
  | null;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Folder filter chips plus create / rename / delete for the selected folder. */
export function SavedFolderBar({ collections, folder, onSelect }: Props) {
  const qc = useQueryClient();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const folders = collections?.items ?? [];
  const unfiled = collections?.uncategorized;
  const total =
    (unfiled?.questionCount ?? 0) +
    (unfiled?.documentCount ?? 0) +
    folders.reduce((sum, f) => sum + f.questionCount + (f.documentCount ?? 0), 0);
  const selected = folders.find((f) => f.id === folder);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['bookmark-collections'] });
    void qc.invalidateQueries({ queryKey: ['bookmarks'] });
  };

  const close = () => {
    setDialog(null);
    setName('');
    setError(null);
  };

  const onError = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');

  const create = useMutation({
    mutationFn: (value: string) =>
      apiFetch<{ id: string }>('/bookmarks/collections', {
        method: 'POST',
        body: JSON.stringify({ name: value }),
      }),
    onSuccess: (created) => {
      refresh();
      close();
      onSelect(created.id);
    },
    onError,
  });

  const rename = useMutation({
    mutationFn: ({ id, value }: { id: string; value: string }) =>
      apiFetch(`/bookmarks/collections/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: value }),
      }),
    onSuccess: () => {
      refresh();
      close();
    },
    onError,
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/bookmarks/collections/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      refresh();
      close();
      onSelect('all');
    },
    onError,
  });

  const chips: Array<{ key: FolderKey; label: string; count: number; icon: typeof Folder }> = [
    { key: 'all', label: 'All saved items', count: total, icon: Layers },
    ...folders.map((f) => ({
      key: f.id,
      label: f.name,
      count: f.questionCount + (f.documentCount ?? 0),
      icon: folder === f.id ? FolderOpen : Folder,
    })),
    ...(unfiled && unfiled.questionCount + (unfiled.documentCount ?? 0) > 0
      ? [
          {
            key: 'uncategorized' as const,
            label: 'No folder',
            count: unfiled.questionCount + (unfiled.documentCount ?? 0),
            icon: Folder,
          },
        ]
      : []),
  ];

  const nameDialog = dialog?.kind === 'create' || dialog?.kind === 'rename';
  const namePending = create.isPending || rename.isPending;

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-3 shadow-[var(--shadow-sm)] sm:p-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[0.6875rem] font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
          Folders
        </p>
        <div className="flex items-center gap-1">
          {selected ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-9 px-2.5"
                onClick={() => {
                  setName(selected.name);
                  setDialog({ kind: 'rename', id: selected.id, name: selected.name });
                }}
              >
                <Pencil className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Rename</span>
                <span className="sr-only sm:hidden">Rename folder {selected.name}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-9 px-2.5 text-[var(--muted-strong)] hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                onClick={() =>
                  setDialog({
                    kind: 'delete',
                    id: selected.id,
                    name: selected.name,
                    count: selected.questionCount + (selected.documentCount ?? 0),
                  })
                }
              >
                <Trash2 className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">Delete</span>
                <span className="sr-only sm:hidden">Delete folder {selected.name}</span>
              </Button>
            </>
          ) : null}
          <Button
            type="button"
            variant="soft"
            size="sm"
            className="min-h-9 px-3"
            onClick={() => setDialog({ kind: 'create' })}
          >
            <FolderPlus className="size-3.5" aria-hidden />
            New folder
          </Button>
        </div>
      </div>

      {/* Horizontal scroll on phones, wraps on wider screens. */}
      <div
        role="radiogroup"
        aria-label="Filter saved items by folder"
        className="-mx-1 mt-2.5 flex gap-1.5 overflow-x-auto overscroll-x-contain px-1 pb-1 sm:flex-wrap sm:overflow-visible"
      >
        {chips.map((chip) => {
          const active = chip.key === folder;
          const Icon = chip.icon;
          return (
            <button
              key={chip.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(chip.key)}
              className={cn(
                'inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-3 text-sm whitespace-nowrap transition-colors',
                active
                  ? 'border-[var(--accent)] bg-[var(--brand-wash-strong)] font-semibold text-[var(--ink)]'
                  : 'border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--line-strong)] hover:bg-[var(--bg-muted)]',
              )}
            >
              <Icon
                className={cn('size-3.5', active ? 'text-[var(--highlight)]' : 'text-[var(--muted)]')}
                aria-hidden
              />
              <span className="max-w-[12rem] truncate">{chip.label}</span>
              <span className="text-xs tabular-nums text-[var(--muted-strong)]">{chip.count}</span>
            </button>
          );
        })}
      </div>

      <FormDialog
        open={nameDialog}
        title={dialog?.kind === 'rename' ? 'Rename folder' : 'New folder'}
        confirmLabel={dialog?.kind === 'rename' ? 'Rename' : 'Create folder'}
        pending={namePending}
        error={error}
        disableSubmit={!name.trim() || namePending}
        onClose={() => {
          if (!namePending) close();
        }}
        onSubmit={() => {
          const value = name.trim();
          if (!value) return;
          if (dialog?.kind === 'rename') rename.mutate({ id: dialog.id, value });
          else create.mutate(value);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="saved-folder-name">Folder name</Label>
          <Input
            id="saved-folder-name"
            value={name}
            maxLength={80}
            autoFocus
            placeholder="e.g. Weak topics"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
        </div>
      </FormDialog>

      <ConfirmDialog
        open={dialog?.kind === 'delete'}
        title="Delete folder?"
        description={
          dialog?.kind === 'delete' ? (
            <>
              Delete “{dialog.name}”?{' '}
              {dialog.count > 0
                ? `Its ${plural(dialog.count, 'saved item', 'saved items')} will stay saved under “No folder”.`
                : 'It is empty.'}
              {error ? <span className="mt-2 block text-[var(--danger)]">{error}</span> : null}
            </>
          ) : null
        }
        confirmLabel="Delete folder"
        destructive
        pending={remove.isPending}
        onCancel={() => {
          if (!remove.isPending) close();
        }}
        onConfirm={() => {
          if (dialog?.kind === 'delete') remove.mutate(dialog.id);
        }}
      />
    </div>
  );
}
