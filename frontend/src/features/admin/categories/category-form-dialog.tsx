'use client';

import { useEffect, useRef, useState } from 'react';
import { HOMEPAGE_ICON_KEYS, type HomepageIconKey } from '@your-academy/shared';
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
  /** Show icon picker (Topic Base taxonomy). */
  allowIcon?: boolean;
  /**
   * Topic Base: parent select lists Category + Sub Category so admins can
   * create Level-3 Child Categories under a Sub Category.
   */
  allowNestedParents?: boolean;
  onClose: () => void;
  onSubmit: (values: {
    name: string;
    description?: string;
    parentId?: string;
    isActive: boolean;
    iconKey?: string | null;
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
  allowIcon = false,
  allowNestedParents = false,
  onClose,
  onSubmit,
}: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [iconKey, setIconKey] = useState<HomepageIconKey | ''>('book');

  // Reset the fields when the dialog opens or targets another category — not when a
  // background refetch hands us a new copy of the same record (that would wipe typing).
  const initialRef = useRef(initial);
  initialRef.current = initial;
  const initialId = initial?.id;
  useEffect(() => {
    if (!open) return;
    const initial = initialRef.current;
    setName(initial?.name ?? '');
    setDescription(initial?.description ?? '');
    setIsActive(initial?.isActive ?? true);
    const initialIcon = (initial?.iconKey as HomepageIconKey | null | undefined) ?? 'book';
    setIconKey(
      initialIcon && (HOMEPAGE_ICON_KEYS as readonly string[]).includes(initialIcon)
        ? initialIcon
        : 'book',
    );
    if (mode === 'create-child') {
      setParentId(defaultParentId || initial?.parentId || '');
    } else if (mode === 'edit' && initial?.parentId) {
      setParentId(initial.parentId);
    } else {
      setParentId('');
    }
  }, [open, initialId, mode, defaultParentId]);

  const isChild = mode === 'create-child' || (mode === 'edit' && Boolean(initial?.parentId));
  const parentIsSubcategory = Boolean(
    allowNestedParents &&
      parentId &&
      roots.some((r) => (r.children ?? []).some((c) => c.id === parentId)),
  );
  const title =
    mode === 'edit'
      ? isChild
        ? parentIsSubcategory ||
          roots.some((r) => (r.children ?? []).some((c) => c.id === initial?.parentId))
          ? 'Edit child category'
          : 'Edit subcategory'
        : 'Edit category'
      : mode === 'create-child'
        ? parentIsSubcategory
          ? 'Add child category'
          : 'Add subcategory'
        : 'Create category';

  const parentOptions = allowNestedParents
    ? roots.flatMap((r) => [
        { id: r.id, label: r.name, inactive: !r.isActive },
        ...(r.children ?? []).map((c) => ({
          id: c.id,
          label: `${r.name} · ${c.name}`,
          inactive: !c.isActive,
        })),
      ])
    : roots.map((r) => ({ id: r.id, label: r.name, inactive: !r.isActive }));

  return (
    <FormDialog
      open={open}
      title={title}
      description={
        mode === 'create-child'
          ? allowNestedParents
            ? 'Pick a Category (Level 2) or Sub Category (Level 3 Child Category).'
            : 'Subcategories belong to one parent category.'
          : mode === 'create-root'
            ? 'Categories group questions and collections.'
            : isChild
              ? 'Update name, parent category, description, or status.'
              : 'Update the display name, description, or status.'
      }
      confirmLabel={mode === 'edit' ? 'Save changes' : 'Create'}
      pending={pending}
      error={error}
      disableSubmit={!name.trim() || (isChild && !parentId)}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
          parentId: isChild ? parentId || undefined : undefined,
          isActive,
          iconKey: allowIcon ? iconKey || 'book' : undefined,
        })
      }
    >
      {isChild ? (
        <Field>
          <Label htmlFor="cat-parent">Parent</Label>
          <Select
            id="cat-parent"
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            required
          >
            <option value="">Select parent…</option>
            {parentOptions
              .filter((p) => p.id !== initial?.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.inactive ? ' (inactive)' : ''}
                </option>
              ))}
          </Select>
        </Field>
      ) : null}

      <Field>
        <Label htmlFor="cat-name">
          {isChild
            ? parentIsSubcategory
              ? 'Child category name'
              : 'Subcategory name'
            : 'Category name'}
        </Label>
        <Input
          id="cat-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={isChild ? 'e.g. চর্যাপদ' : 'e.g. বাংলা'}
          required
          minLength={2}
          maxLength={120}
        />
      </Field>

      {allowIcon ? (
        <Field>
          <Label htmlFor="cat-icon">Icon</Label>
          <Select
            id="cat-icon"
            value={iconKey}
            onChange={(e) => setIconKey(e.target.value as HomepageIconKey)}
          >
            {HOMEPAGE_ICON_KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

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
