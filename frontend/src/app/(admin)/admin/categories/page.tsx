'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronRight,
  FolderTree,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import {
  CategoryFormDialog,
  type CategoryFormMode,
} from '@/features/admin/categories/category-form-dialog';
import type {
  AdminCategoryChild,
  AdminCategoryNode,
  CategoryRecord,
} from '@/features/admin/categories/types';
import { ApiError, apiFetch } from '@/lib/api/client';
import { AdminCategoriesPageSkeleton } from '@/components/skeletons';
import { cn } from '@/lib/utils';
import {
  AdminPage,
  AdminSection,
  AdminStatGrid,
  AdminToolbar,
} from '@/components/admin/admin-page';
import { AdminRowActions } from '@/components/admin/admin-row-actions';

type StatusFilter = 'all' | 'active' | 'inactive';
type DialogState =
  | { kind: 'form'; mode: CategoryFormMode; target?: CategoryRecord; parentId?: string }
  | {
      kind: 'confirm';
      action: 'deactivate' | 'activate' | 'delete';
      target: CategoryRecord & { isChild?: boolean };
    }
  | null;

export default function AdminCategoriesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<DialogState>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);

  const categories = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiFetch<AdminCategoryNode[]>('/admin/categories'),
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('bn');
    return (categories.data ?? [])
      .map((root) => {
        const children = root.children.filter((child) => {
          if (status === 'active' && !child.isActive) return false;
          if (status === 'inactive' && child.isActive) return false;
          if (!needle) return true;
          return (
            child.name.toLocaleLowerCase('bn').includes(needle) ||
            (child.description ?? '').toLocaleLowerCase('bn').includes(needle)
          );
        });
        const rootMatchesStatus =
          status === 'all' || (status === 'active' ? root.isActive : !root.isActive);
        const rootMatchesQuery =
          !needle ||
          root.name.toLocaleLowerCase('bn').includes(needle) ||
          (root.description ?? '').toLocaleLowerCase('bn').includes(needle) ||
          children.length > 0;
        if (!rootMatchesStatus && children.length === 0) return null;
        if (!rootMatchesQuery) return null;
        return {
          ...root,
          children: needle || status !== 'all' ? children : root.children,
        };
      })
      .filter(Boolean) as AdminCategoryNode[];
  }, [categories.data, q, status]);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-categories'] });
    void qc.invalidateQueries({ queryKey: ['categories'] });
  };

  const save = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      parentId?: string;
      isActive: boolean;
    }) => {
      if (!dialog || dialog.kind !== 'form') throw new Error('No form open');
      if (dialog.mode === 'edit' && dialog.target) {
        return apiFetch<CategoryRecord>(`/admin/categories/${dialog.target.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: values.name,
            description: values.description ?? null,
            isActive: values.isActive,
          }),
        });
      }
      return apiFetch<CategoryRecord>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          parentId: values.parentId || dialog.parentId || undefined,
          isActive: values.isActive,
        }),
      });
    },
    onSuccess: () => {
      setDialog(null);
      setFormError(null);
      setBanner({
        tone: 'success',
        text: dialog?.kind === 'form' && dialog.mode === 'edit' ? 'Saved' : 'Created',
      });
      invalidate();
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : 'Save failed');
    },
  });

  const confirmAction = useMutation({
    mutationFn: async () => {
      if (!dialog || dialog.kind !== 'confirm') throw new Error('No confirm open');
      const { action, target } = dialog;
      if (action === 'activate') {
        return apiFetch(`/admin/categories/${target.id}/activate`, { method: 'POST' });
      }
      if (action === 'deactivate') {
        return apiFetch(`/admin/categories/${target.id}/deactivate`, { method: 'POST' });
      }
      return apiFetch(`/admin/categories/${target.id}?hard=true`, { method: 'DELETE' });
    },
    onSuccess: () => {
      const action = dialog?.kind === 'confirm' ? dialog.action : 'delete';
      setDialog(null);
      setBanner({
        tone: 'success',
        text:
          action === 'activate'
            ? 'Activated'
            : action === 'deactivate'
              ? 'Deactivated'
              : 'Deleted permanently',
      });
      invalidate();
    },
    onError: (err) => {
      setBanner({
        tone: 'danger',
        text: err instanceof ApiError ? err.message : 'Action failed',
      });
      setDialog(null);
    },
  });

  const openCreateRoot = () => {
    setFormError(null);
    setDialog({ kind: 'form', mode: 'create-root' });
  };

  const openCreateChild = (parentId: string) => {
    setFormError(null);
    setExpanded((e) => ({ ...e, [parentId]: true }));
    setDialog({ kind: 'form', mode: 'create-child', parentId });
  };

  const openEdit = (target: CategoryRecord) => {
    setFormError(null);
    setDialog({ kind: 'form', mode: 'edit', target });
  };

  const totals = useMemo(() => {
    const roots = categories.data ?? [];
    return {
      categories: roots.length,
      subcategories: roots.reduce((n, r) => n + r.children.length, 0),
      inactive: roots.reduce(
        (n, r) => n + (r.isActive ? 0 : 1) + r.children.filter((c) => !c.isActive).length,
        0,
      ),
    };
  }, [categories.data]);

  return (
    <AdminPage>
      <PageHeader
        eyebrow="Taxonomy"
        title="Categories"
        description="Organize the question bank with categories and optional subcategories."
        actions={
          <Button type="button" className="cursor-pointer" onClick={openCreateRoot}>
            <Plus className="size-4" />
            Create category
          </Button>
        }
      />

      {banner ? (
        <Alert variant={banner.tone === 'success' ? 'success' : 'danger'}>
          <div className="flex items-start justify-between gap-3">
            <span>{banner.text}</span>
            <button
              type="button"
              className="cursor-pointer text-xs font-semibold underline-offset-2 hover:underline"
              onClick={() => setBanner(null)}
            >
              Dismiss
            </button>
          </div>
        </Alert>
      ) : null}

      <AdminStatGrid className="sm:grid-cols-3 xl:grid-cols-3">
        <Surface className="p-4">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Categories
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{totals.categories}</p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Subcategories
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {totals.subcategories}
          </p>
        </Surface>
        <Surface className="p-4">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted-strong)] uppercase">
            Inactive
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{totals.inactive}</p>
        </Surface>
      </AdminStatGrid>

      <AdminToolbar>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="cat-search">Search</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-[var(--muted-strong)]"
                aria-hidden
              />
              <Input
                id="cat-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search categories or subcategories…"
                className="h-10 pl-9"
              />
            </div>
          </div>
          <div className="w-full space-y-2 sm:w-48">
            <Label htmlFor="cat-status-filter">Status</Label>
            <Select
              id="cat-status-filter"
              className="h-10"
              value={status}
              onChange={(e) => setStatus(e.target.value as StatusFilter)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </AdminToolbar>

      <AdminSection
        title="Category tree"
        description={
          categories.data
            ? `${filtered.length} of ${totals.categories} categories shown.`
            : undefined
        }
      >
        {categories.isLoading ? <AdminCategoriesPageSkeleton omitHeader /> : null}

        {categories.isError ? (
          <Alert variant="danger">
            {categories.error instanceof ApiError
              ? categories.error.message
              : 'Could not load categories'}
          </Alert>
        ) : null}

        {!categories.isLoading && !categories.isError && filtered.length === 0 ? (
          <EmptyState
            title={q || status !== 'all' ? 'No matches' : 'No categories yet'}
            description={
              q || status !== 'all'
                ? 'Try a different search or status filter.'
                : 'Create your first category to organize question collections.'
            }
            action={
              !q && status === 'all' ? (
                <Button type="button" className="cursor-pointer" onClick={openCreateRoot}>
                  <Plus className="size-4" />
                  Create category
                </Button>
              ) : undefined
            }
          />
        ) : null}

        <ul className="space-y-3">
          {filtered.map((root) => {
            const isOpen = expanded[root.id] ?? true;
            return (
              <li key={root.id}>
                <Surface elevated className="overflow-hidden">
                  <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
                    <button
                      type="button"
                      className="mt-0.5 cursor-pointer rounded-[8px] p-1 text-[var(--muted-strong)] hover:bg-[var(--bg-muted)]"
                      aria-expanded={isOpen}
                      aria-label={isOpen ? 'Collapse subcategories' : 'Expand subcategories'}
                      onClick={() => setExpanded((e) => ({ ...e, [root.id]: !isOpen }))}
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                    </button>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <FolderTree className="size-4 text-[var(--highlight)]" />
                        <h3 className="font-display text-base font-bold text-[var(--ink)]">
                          {root.name}
                        </h3>
                        <Badge variant={root.isActive ? 'success' : 'outline'}>
                          {root.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {root.description ? (
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">
                          {root.description}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs font-medium text-[var(--muted-strong)]">
                        {root.subcategoryCount} subcategor
                        {root.subcategoryCount === 1 ? 'y' : 'ies'}
                        {' · '}
                        {root.questionCount} question{root.questionCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <AdminRowActions
                      primary={
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => openCreateChild(root.id)}
                          >
                            <Plus className="size-3.5" />
                            Subcategory
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() =>
                              openEdit({
                                id: root.id,
                                name: root.name,
                                slug: root.slug,
                                description: root.description,
                                isActive: root.isActive,
                                sortOrder: root.sortOrder,
                                parentId: null,
                              })
                            }
                          >
                            <Pencil className="size-3.5" />
                            Edit
                          </Button>
                        </>
                      }
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer"
                        onClick={() =>
                          setDialog({
                            kind: 'confirm',
                            action: root.isActive ? 'deactivate' : 'activate',
                            target: {
                              id: root.id,
                              name: root.name,
                              slug: root.slug,
                              description: root.description,
                              isActive: root.isActive,
                              sortOrder: root.sortOrder,
                              parentId: null,
                            },
                          })
                        }
                      >
                        <Power className="size-3.5" />
                        {root.isActive ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="cursor-pointer text-[var(--danger)]"
                        onClick={() =>
                          setDialog({
                            kind: 'confirm',
                            action: 'delete',
                            target: {
                              id: root.id,
                              name: root.name,
                              slug: root.slug,
                              description: root.description,
                              isActive: root.isActive,
                              sortOrder: root.sortOrder,
                              parentId: null,
                            },
                          })
                        }
                      >
                        <Trash2 className="size-3.5" />
                        Delete
                      </Button>
                    </AdminRowActions>
                  </div>

                  {isOpen ? (
                    <div className="border-t border-[var(--line)] bg-[var(--bg-desk)] px-4 py-3 sm:px-5">
                      {root.children.length === 0 ? (
                        <p className="text-sm text-[var(--muted-strong)]">
                          No subcategories yet.{' '}
                          <button
                            type="button"
                            className="cursor-pointer font-semibold text-[var(--highlight)]"
                            onClick={() => openCreateChild(root.id)}
                          >
                            Add one
                          </button>
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {root.children.map((child) => (
                            <SubcategoryRow
                              key={child.id}
                              child={child}
                              onEdit={() =>
                                openEdit({
                                  id: child.id,
                                  name: child.name,
                                  slug: child.slug,
                                  description: child.description,
                                  isActive: child.isActive,
                                  sortOrder: child.sortOrder,
                                  parentId: root.id,
                                })
                              }
                              onToggle={() =>
                                setDialog({
                                  kind: 'confirm',
                                  action: child.isActive ? 'deactivate' : 'activate',
                                  target: {
                                    id: child.id,
                                    name: child.name,
                                    slug: child.slug,
                                    description: child.description,
                                    isActive: child.isActive,
                                    sortOrder: child.sortOrder,
                                    parentId: root.id,
                                    isChild: true,
                                  },
                                })
                              }
                              onDelete={() =>
                                setDialog({
                                  kind: 'confirm',
                                  action: 'delete',
                                  target: {
                                    id: child.id,
                                    name: child.name,
                                    slug: child.slug,
                                    description: child.description,
                                    isActive: child.isActive,
                                    sortOrder: child.sortOrder,
                                    parentId: root.id,
                                    isChild: true,
                                  },
                                })
                              }
                            />
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </Surface>
              </li>
            );
          })}
        </ul>
      </AdminSection>

      <CategoryFormDialog
        open={dialog?.kind === 'form'}
        mode={dialog?.kind === 'form' ? dialog.mode : 'create-root'}
        roots={categories.data ?? []}
        initial={dialog?.kind === 'form' ? dialog.target : null}
        defaultParentId={dialog?.kind === 'form' ? dialog.parentId : undefined}
        pending={save.isPending}
        error={formError}
        onClose={() => {
          if (!save.isPending) {
            setDialog(null);
            setFormError(null);
          }
        }}
        onSubmit={(values) => save.mutate(values)}
      />

      <ConfirmDialog
        open={dialog?.kind === 'confirm'}
        title={
          dialog?.kind === 'confirm'
            ? dialog.action === 'delete'
              ? `Delete “${dialog.target.name}”?`
              : dialog.action === 'deactivate'
                ? `Deactivate “${dialog.target.name}”?`
                : `Activate “${dialog.target.name}”?`
            : 'Confirm'
        }
        description={
          dialog?.kind === 'confirm' && dialog.action === 'delete'
            ? 'Permanent delete only works when this item has no questions, documents, practice sets, or subcategories. Otherwise deactivate it instead.'
            : dialog?.kind === 'confirm' && dialog.action === 'deactivate'
              ? 'Inactive items are hidden from learner and public dropdowns. Existing questions stay linked.'
              : 'This item will appear again in active category lists.'
        }
        confirmLabel={
          dialog?.kind === 'confirm'
            ? dialog.action === 'delete'
              ? 'Delete permanently'
              : dialog.action === 'deactivate'
                ? 'Deactivate'
                : 'Activate'
            : 'Confirm'
        }
        destructive={dialog?.kind === 'confirm' && dialog.action !== 'activate'}
        reversible={dialog?.kind === 'confirm' ? dialog.action !== 'delete' : true}
        pending={confirmAction.isPending}
        onCancel={() => {
          if (!confirmAction.isPending) setDialog(null);
        }}
        onConfirm={() => confirmAction.mutate()}
      />
    </AdminPage>
  );
}

function SubcategoryRow({
  child,
  onEdit,
  onToggle,
  onDelete,
}: {
  child: AdminCategoryChild;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5',
      )}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">{child.name}</p>
          <Badge variant={child.isActive ? 'success' : 'outline'}>
            {child.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted-strong)]">
          {child.questionCount} question{child.questionCount === 1 ? '' : 's'}
        </p>
      </div>
      <AdminRowActions
        primary={
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="cursor-pointer"
            onClick={onEdit}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        }
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="cursor-pointer"
          onClick={onToggle}
        >
          <Power className="size-3.5" />
          {child.isActive ? 'Deactivate' : 'Activate'}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="cursor-pointer text-[var(--danger)]"
          onClick={onDelete}
        >
          <Trash2 className="size-3.5" />
          Delete
        </Button>
      </AdminRowActions>
    </li>
  );
}
