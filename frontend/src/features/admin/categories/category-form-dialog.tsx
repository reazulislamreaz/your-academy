'use client';

import { useEffect, useState } from 'react';
import { Field } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AdminCategoryNode, CategoryRecord } from './types';

export type CategoryFormMode = 'create-root' | 'create-child' | 'edit';

type CategoryFormDialogProps = {
  open: boolean;
  mode: CategoryFormMode;
  roots: AdminCategoryNode[];
  initial?: Partial<CategoryRecord> | null;
  /** Pre-selected parent when adding a subcategory. */
  defaultParentId?: string;
  pending?: boolean;
  error?: string | null;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    description?: string;
    parentId?: string;
    isActive: boolean;
  }) => void;
};

export function CategoryFormDialog({
  open,
  mode,
  roots,
  initial,
  defaultParentId,
  pending,
  error,
  onClose,
  onSubmit,
}: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setIsActive(initial?.isActive ?? true);
    if (mode === 'create-child') {
      setParentId(defaultParentId || initial?.parentId || '');
    } else if (mode === 'edit' && initial?.parentId) {
      setParentId(initial.parentId);
    } else {
      setParentId('');
    }
  }, [open, initial, mode, defaultParentId]);

  const isChild = mode === 'create-child' || (mode === 'edit' && Boolean(initial?.parentId));
  const title =
    mode === 'edit'
      ? isChild
        ? 'Edit subcategory'
        : 'Edit category'
      : mode === 'create-child'
        ? 'Add subcategory'
        : 'Create category';

  return (
    <FormDialog
      open={open}
      title={title}
      description={
        mode === 'create-child'
          ? 'Subcategories belong to one parent category.'
          : mode === 'create-root'
            ? 'Categories group questions and collections.'
            : 'Update the display name, description, or status.'
      }
      confirmLabel={mode === 'edit' ? 'Save changes' : 'Create'}
      pending={pending}
      error={error}
      disableSubmit={!name.trim() || (mode === 'create-child' && !parentId)}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          parentId: isChild ? parentId || undefined : undefined,
          isActive,
        })
      }
    >
      {mode === 'create-child' || (mode === 'edit' && initial?.parentId) ? (
        <Field>
          <Label htmlFor="cat-parent">Parent category</Label>
          <Select
            id="cat-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            disabled={mode === 'edit'}
            required
          >
            <option value="">Select category…</option>
            {roots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {!r.isActive ? ' (inactive)' : ''}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <Field>
        <Label htmlFor="cat-name">{isChild ? 'Subcategory name' : 'Category name'}</Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isChild ? 'e.g. অনুবাদ সাহিত্য' : 'e.g. বাংলা'}
          required
          minLength={2}
          maxLength={120}
        />
      </Field>

      <Field>
        <Label htmlFor="cat-desc">Description (optional)</Label>
        <Textarea
          id="cat-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Short note for admins"
        />
      </Field>

      <Field>
        <Label htmlFor="cat-status">Status</Label>
        <Select
          id="cat-status"
          value={isActive ? 'active' : 'inactive'}
          onChange={(e) => setIsActive(e.target.value === 'active')}
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </Field>
    </FormDialog>
  );
}
