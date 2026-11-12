'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ApiError, apiFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';
import type { CategoryRecord } from './types';

function upsertRootCategory(list: CategoryNode[] | undefined, created: CategoryRecord): CategoryNode[] {
  const current = list ?? [];
  if (current.some((c) => c.id === created.id)) return current;
  return [
    ...current,
    {
      id: created.id,
      name: created.name,
      slug: created.slug,
      description: created.description,
      isActive: created.isActive,
      children: [],
    },
  ].sort((a, b) => a.name.localeCompare(b.name, 'bn'));
}

function upsertChildCategory(
  list: CategoryNode[] | undefined,
  parentId: string,
  created: CategoryRecord,
): CategoryNode[] {
  return (list ?? []).map((root) => {
    if (root.id !== parentId) return root;
    if (root.children.some((c) => c.id === created.id)) return root;
    return {
      ...root,
      children: [
        ...root.children,
        {
          id: created.id,
          name: created.name,
          slug: created.slug,
          description: created.description,
          isActive: created.isActive,
        },
      ].sort((a, b) => a.name.localeCompare(b.name, 'bn')),
    };
  });
}

type QuickCreateCategoryButtonProps = {
  onCreated: (category: CategoryRecord) => void;
  disabled?: boolean;
};

export function QuickCreateCategoryButton({
  onCreated,
  disabled,
}: QuickCreateCategoryButtonProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      apiFetch<CategoryRecord>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), isActive: true }),
      }),
    onSuccess: (created) => {
      qc.setQueryData<CategoryNode[]>(['categories'], (prev) => upsertRootCategory(prev, created));
      void qc.invalidateQueries({ queryKey: ['categories'] });
      void qc.invalidateQueries({ queryKey: ['admin-categories'] });
      setOpen(false);
      setName('');
      setError(null);
      onCreated(created);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not create category');
    },
  });

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 cursor-pointer px-2.5"
        aria-label="Create category"
        title="Create category"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Plus className="size-4" />
      </Button>
      <FormDialog
        open={open}
        title="New category"
        description="Created categories appear immediately in this dropdown."
        confirmLabel="Create"
        pending={create.isPending}
        error={error}
        disableSubmit={name.trim().length < 2}
        onClose={() => {
          if (!create.isPending) setOpen(false);
        }}
        onSubmit={() => create.mutate()}
      >
        <Field>
          <Label htmlFor="quick-cat-name">Category name</Label>
          <Input
            id="quick-cat-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. বাংলা"
            required
            minLength={2}
            maxLength={120}
          />
        </Field>
      </FormDialog>
    </>
  );
}

type QuickCreateSubcategoryButtonProps = {
  parentId: string | null;
  parentName?: string;
  onCreated: (subcategory: CategoryRecord) => void;
  disabled?: boolean;
};

export function QuickCreateSubcategoryButton({
  parentId,
  parentName,
  onCreated,
  disabled,
}: QuickCreateSubcategoryButtonProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      if (!parentId) throw new ApiError('PARENT_REQUIRED', 'Select a category first', 400);
      return apiFetch<CategoryRecord>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          parentId,
          isActive: true,
        }),
      });
    },
    onSuccess: (created) => {
      if (parentId) {
        qc.setQueryData<CategoryNode[]>(['categories'], (prev) =>
          upsertChildCategory(prev, parentId, created),
        );
      }
      void qc.invalidateQueries({ queryKey: ['categories'] });
      void qc.invalidateQueries({ queryKey: ['admin-categories'] });
      setOpen(false);
      setName('');
      setError(null);
      onCreated(created);
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Could not create subcategory');
    },
  });

  return (
    <>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="shrink-0 cursor-pointer px-2.5"
        aria-label="Create subcategory"
        title={parentId ? 'Create subcategory' : 'Select a category first'}
        disabled={disabled || !parentId}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Plus className="size-4" />
      </Button>
      <FormDialog
        open={open}
        title="New subcategory"
        description={
          parentName
            ? `Will be added under “${parentName}”.`
            : 'Will be added under the selected category.'
        }
        confirmLabel="Create"
        pending={create.isPending}
        error={error}
        disableSubmit={name.trim().length < 2 || !parentId}
        onClose={() => {
          if (!create.isPending) setOpen(false);
        }}
        onSubmit={() => create.mutate()}
      >
        <Field>
          <Label htmlFor="quick-sub-name">Subcategory name</Label>
          <Input
            id="quick-sub-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. অনুবাদ সাহিত্য"
            required
            minLength={2}
            maxLength={120}
          />
        </Field>
      </FormDialog>
    </>
  );
}
