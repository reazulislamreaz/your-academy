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
import type { CategoryRecord, CategoryScope } from './types';

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
  const leaf = {
    id: created.id,
    name: created.name,
    slug: created.slug,
    description: created.description,
    isActive: created.isActive,
    children: [] as CategoryNode['children'],
  };
  return (list ?? []).map((root) => {
    // Level-2 under a Category root.
    if (root.id === parentId) {
      if (root.children.some((c) => c.id === created.id)) return root;
      return {
        ...root,
        children: [...root.children, leaf].sort((a, b) => a.name.localeCompare(b.name, 'bn')),
      };
    }
    // Level-3 Child Category under a Sub Category.
    if ((root.children ?? []).some((c) => c.id === parentId)) {
      return {
        ...root,
        children: root.children.map((sub) => {
          if (sub.id !== parentId) return sub;
          const existing = sub.children ?? [];
          if (existing.some((c) => c.id === created.id)) return sub;
          return {
            ...sub,
            children: [...existing, leaf].sort((a, b) => a.name.localeCompare(b.name, 'bn')),
          };
        }),
      };
    }
    return root;
  });
}

type QuickCreateCategoryButtonProps = {
  onCreated: (category: CategoryRecord) => void;
  disabled?: boolean;
  /** Bank scope for the new root category (DEC-041). */
  scope?: CategoryScope;
};

export function QuickCreateCategoryButton({
  onCreated,
  disabled,
  scope = 'PRELIMINARY',
}: QuickCreateCategoryButtonProps) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      apiFetch<CategoryRecord>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), scope, isActive: true }),
      }),
    onSuccess: (created) => {
      qc.setQueryData<CategoryNode[]>(['categories', scope], (prev) =>
        upsertRootCategory(prev, created),
      );
      qc.setQueryData<CategoryNode[]>(['categories'], (prev) => upsertRootCategory(prev, created));
      void qc.invalidateQueries({ queryKey: ['categories', scope] });
      void qc.invalidateQueries({ queryKey: ['categories'] });
      void qc.invalidateQueries({ queryKey: ['admin-categories', scope] });
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
        title={scope === 'WRITTEN' ? 'New Written category' : 'New category'}
        description={
          scope === 'WRITTEN'
            ? 'Added to the Written Question Bank taxonomy only.'
            : 'Created categories appear immediately in this dropdown.'
        }
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
  /** Inherited from parent; sent so the API validates scope consistently. */
  scope?: CategoryScope;
};

export function QuickCreateSubcategoryButton({
  parentId,
  parentName,
  onCreated,
  disabled,
  scope = 'PRELIMINARY',
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
          scope,
          isActive: true,
        }),
      });
    },
    onSuccess: (created) => {
      if (parentId) {
        qc.setQueryData<CategoryNode[]>(['categories', scope], (prev) =>
          upsertChildCategory(prev, parentId, created),
        );
        qc.setQueryData<CategoryNode[]>(['categories'], (prev) =>
          upsertChildCategory(prev, parentId, created),
        );
      }
      void qc.invalidateQueries({ queryKey: ['categories', scope] });
      void qc.invalidateQueries({ queryKey: ['categories'] });
      void qc.invalidateQueries({ queryKey: ['admin-categories', scope] });
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
        title={scope === 'WRITTEN' ? 'New Written subcategory' : 'New subcategory'}
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
