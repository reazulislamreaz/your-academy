'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  FolderTree,
  Pencil,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AdminPage,
  AdminSection,
  AdminStatGrid,
  AdminToolbar,
} from '@/components/admin/admin-page';
import { AdminRowActions } from '@/components/admin/admin-row-actions';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { AdminCategoriesPageSkeleton } from '@/components/skeletons';
import { ApiError, apiFetch } from '@/lib/api/client';
import { revalidateHomepageCache } from '@/lib/api/revalidate-homepage';
import {
  CategoryFormDialog,
  type CategoryFormMode,
} from './category-form-dialog';
import type {
  AdminCategoryChild,
  AdminCategoryNode,
  CategoryRecord,
  CategoryScope,
} from './types';

type StatusFilter = 'all' | 'active' | 'inactive';
type PageSize = 10 | 20 | 50 | 100;
type DialogState =
  | { kind: 'form'; mode: CategoryFormMode; target?: CategoryRecord; parentId?: string }
  | {
      kind: 'confirm';
      action: 'deactivate' | 'activate' | 'delete';
      target: CategoryRecord & { isChild?: boolean };
    }
  | null;

type Props = {
  title?: string;
  description?: string;
  eyebrow?: string;
  /** Optional extra header actions (e.g. link to homepage tiles). */
  headerExtra?: ReactNode;
  /** Hide outer AdminPage wrapper when embedded in a tabbed host. */
  embedded?: boolean;
  /** Preliminary / Written / Topic bank taxonomy (DEC-041/042). */
  scope?: CategoryScope;
};

const PAGE_SIZES: PageSize[] = [10, 20, 50, 100];

/**
 * Full admin taxonomy tree — every root category and every subcategory.
 * No artificial child limits; search/status only filter the view.
 */
export function CategoryTaxonomyManager({
  title = 'Question Bank Categories',
  description = 'View and manage every category and all of its subcategories.',
  eyebrow = 'Taxonomy',
  headerExtra,
  embedded,
  scope = 'PRELIMINARY',
}: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialog, setDialog] = useState<DialogState>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

  const categories = useQuery({
    queryKey: ['admin-categories', scope],
    queryFn: () =>
      apiFetch<AdminCategoryNode[]>(`/admin/categories?scope=${encodeURIComponent(scope)}`),
  });

  // Always expand all roots once data arrives (and when searching, keep matches open).
  useEffect(() => {
    const roots = categories.data ?? [];
    if (roots.length === 0) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const root of roots) {
        if (next[root.id] === undefined) next[root.id] = true;
      }
      return next;
    });
  }, [categories.data]);

  useEffect(() => {
    setPage(1);
  }, [q, status, pageSize]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase('bn');
    return (categories.data ?? [])
      .map((root) => {
        // Start from ALL children — never slice/cap the list.
        const allChildren = root.children ?? [];
        const children = allChildren.filter((child) => {
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
          // When filtering, show matching children; otherwise every child.
          children: needle || status !== 'all' ? children : allChildren,
          subcategoryCount: allChildren.length,
        };
      })
      .filter(Boolean) as AdminCategoryNode[];
  }, [categories.data, q, status]);

  // Auto-expand parents that have matching children while searching.
  useEffect(() => {
    if (!q.trim()) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const root of filtered) {
        if (root.children.length > 0) next[root.id] = true;
      }
      return next;
    });
  }, [filtered, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRoots = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['admin-categories', scope] });
    void qc.invalidateQueries({ queryKey: ['admin-categories'] });
    void qc.invalidateQueries({ queryKey: ['categories', scope] });
    void qc.invalidateQueries({ queryKey: ['categories', 'public', scope] });
    void qc.invalidateQueries({ queryKey: ['categories'] });
    // Topic Base homepage + /topic-categories read live TOPIC taxonomy (ISR).
    if (scope === 'TOPIC') {
      void revalidateHomepageCache();
    }
  };

  const reorder = useMutation({
    mutationFn: async ({
      id,
      direction,
    }: {
      id: string;
      direction: 'up' | 'down';
    }) => {
      const roots = categories.data ?? [];
      let siblings: Array<{ id: string }> = [];
      if (roots.some((r) => r.id === id)) {
        siblings = roots.map((r) => ({ id: r.id }));
      } else {
        for (const root of roots) {
          if ((root.children ?? []).some((c) => c.id === id)) {
            siblings = (root.children ?? []).map((c) => ({ id: c.id }));
            break;
          }
        }
      }
      const index = siblings.findIndex((s) => s.id === id);
      const swapWith = direction === 'up' ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= siblings.length) {
        return;
      }
      const next = [...siblings];
      const tmp = next[index]!;
      next[index] = next[swapWith]!;
      next[swapWith] = tmp;
      // Renumber so ties (all sortOrder 0) still produce a stable display order.
      await Promise.all(
        next.map((item, sortOrder) =>
          apiFetch(`/admin/categories/${item.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ sortOrder }),
          }),
        ),
      );
    },
    onSuccess: () => {
      setBanner({ tone: 'success', text: 'Order updated' });
      invalidate();
    },
    onError: (err) => {
      setBanner({
        tone: 'danger',
        text: err instanceof ApiError ? err.message : 'Could not update order',
      });
    },
  });

  const save = useMutation({
    mutationFn: async (values: {
      name: string;
      description?: string;
      parentId?: string;
      isActive: boolean;
      iconKey?: string | null;
    }) => {
      if (!dialog || dialog.kind !== 'form') throw new Error('No form open');
      if (dialog.mode === 'edit' && dialog.target) {
        const isChild = Boolean(dialog.target.parentId);
        return apiFetch<CategoryRecord>(`/admin/categories/${dialog.target.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            name: values.name,
            description: values.description ?? null,
            isActive: values.isActive,
            ...(isChild && values.parentId ? { parentId: values.parentId } : {}),
            ...(scope === 'TOPIC' ? { iconKey: values.iconKey ?? null } : {}),
          }),
        });
      }
      return apiFetch<CategoryRecord>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          name: values.name,
          description: values.description,
          parentId: values.parentId || dialog.parentId || undefined,
          scope,
          isActive: values.isActive,
          ...(scope === 'TOPIC' ? { iconKey: values.iconKey ?? 'book' } : {}),
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

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const root of categories.data ?? []) next[root.id] = true;
    setExpanded(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    for (const root of categories.data ?? []) next[root.id] = false;
    setExpanded(next);
  };

  const totals = useMemo(() => {
    const roots = categories.data ?? [];
    return {
      categories: roots.length,
      subcategories: roots.reduce((n, r) => n + (r.children?.length ?? 0), 0),
      inactive: roots.reduce(
        (n, r) =>
          n + (r.isActive ? 0 : 1) + (r.children ?? []).filter((c) => !c.isActive).length,
        0,
      ),
    };
  }, [categories.data]);

  const visibleSubCount = filtered.reduce((n, r) => n + r.children.length, 0);

  const body = (
    <>
      {!embedded ? (
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={
            <div className="flex flex-wrap gap-2">
              {headerExtra}
              <Button type="button" className="cursor-pointer" onClick={openCreateRoot}>
                <Plus className="size-4" />
                Create category
              </Button>
            </div>
          }
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-[var(--muted)]">
            {totals.categories} categories · {totals.subcategories} subcategories in the database
          </p>
          <Button type="button" size="sm" className="cursor-pointer" onClick={openCreateRoot}>
            <Plus className="size-4" />
            Create category
          </Button>
        </div>
      )}

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

      <AdminStatGrid className="sm:grid-cols-3">
        <Surface className="p-3.5 sm:p-4">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
            Categories
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{totals.categories}</p>
        </Surface>
        <Surface className="p-3.5 sm:p-4">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
            Subcategories
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">
            {totals.subcategories}
          </p>
        </Surface>
        <Surface className="p-3.5 sm:p-4">
          <p className="text-xs font-semibold tracking-wide text-[var(--muted)] uppercase">
            Inactive
          </p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums">{totals.inactive}</p>
        </Surface>
      </AdminStatGrid>

      <AdminToolbar>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <div className="min-w-0 flex-1 space-y-2">
            <Label htmlFor="cat-search">Search</Label>
            <SearchField
              id="cat-search"
              value={q}
              onChange={setQ}
              placeholder="Search categories or subcategories…"
              aria-label="Search categories or subcategories"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-end">
            <div className="space-y-2 sm:w-40">
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
            <div className="space-y-2 sm:w-32">
              <Label htmlFor="cat-page-size">Per page</Label>
              <Select
                id="cat-page-size"
                className="h-10"
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
            <Button type="button" size="sm" variant="ghost" className="mt-auto" onClick={expandAll}>
              Expand all
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-auto"
              onClick={collapseAll}
            >
              Collapse all
            </Button>
          </div>
        </div>
      </AdminToolbar>

      <AdminSection
        title="All categories & subcategories"
        description={
          categories.data
            ? `Showing ${pageRoots.length} of ${filtered.length} categories · ${visibleSubCount} subcategories in this view (of ${totals.subcategories} total).`
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
          {pageRoots.map((root) => {
            const isOpen = expanded[root.id] ?? true;
            const allChildCount = (categories.data ?? []).find((r) => r.id === root.id)?.children
              .length;
            return (
              <li key={root.id}>
                <Surface elevated>
                  <div className="flex flex-wrap items-start gap-2 p-3.5 sm:gap-3 sm:p-5">
                    <button
                      type="button"
                      className="-m-1 flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--muted)] hover:bg-[var(--bg-muted)] sm:m-0 sm:size-9"
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
                        <p className="mt-1 text-sm text-[var(--muted)]">{root.description}</p>
                      ) : null}
                      <p className="mt-2 text-xs font-medium text-[var(--muted)]">
                        {allChildCount ?? root.children.length} subcategor
                        {(allChildCount ?? root.children.length) === 1 ? 'y' : 'ies'}
                        {q || status !== 'all'
                          ? ` · ${root.children.length} shown`
                          : null}
                        {' · '}
                        {root.questionCount} question{root.questionCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <AdminRowActions
                      className="w-full justify-start sm:w-auto sm:justify-end [&_button]:min-h-10 sm:[&_button]:min-h-0"
                      primary={
                        <>
                          {scope === 'TOPIC' ? (
                            <>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer"
                                disabled={
                                  reorder.isPending ||
                                  (categories.data ?? []).findIndex((r) => r.id === root.id) <=
                                    0
                                }
                                aria-label={`Move ${root.name} up`}
                                onClick={() =>
                                  reorder.mutate({ id: root.id, direction: 'up' })
                                }
                              >
                                <ArrowUp className="size-3.5" />
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="cursor-pointer"
                                disabled={
                                  reorder.isPending ||
                                  (categories.data ?? []).findIndex((r) => r.id === root.id) >=
                                    (categories.data ?? []).length - 1
                                }
                                aria-label={`Move ${root.name} down`}
                                onClick={() =>
                                  reorder.mutate({ id: root.id, direction: 'down' })
                                }
                              >
                                <ArrowDown className="size-3.5" />
                              </Button>
                            </>
                          ) : null}
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
                                iconKey: root.iconKey,
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
                    <div className="rounded-b-[var(--radius-lg)] border-t border-[var(--line)] bg-[var(--bg-desk)] px-3 py-3 sm:px-5">
                      {root.children.length === 0 ? (
                        <p className="text-sm text-[var(--muted)]">
                          {q || status !== 'all'
                            ? 'No matching subcategories for this filter.'
                            : 'No subcategories yet. '}
                          {!q && status === 'all' ? (
                            <button
                              type="button"
                              className="cursor-pointer font-semibold text-[var(--highlight)]"
                              onClick={() => openCreateChild(root.id)}
                            >
                              Add one
                            </button>
                          ) : null}
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {root.children.map((child, childIndex) => (
                            <SubcategoryRow
                              key={child.id}
                              child={child}
                              allowReorder={scope === 'TOPIC'}
                              canMoveUp={childIndex > 0}
                              canMoveDown={childIndex < root.children.length - 1}
                              reorderPending={reorder.isPending}
                              onMoveUp={() =>
                                reorder.mutate({ id: child.id, direction: 'up' })
                              }
                              onMoveDown={() =>
                                reorder.mutate({ id: child.id, direction: 'down' })
                              }
                              onEdit={() =>
                                openEdit({
                                  id: child.id,
                                  name: child.name,
                                  slug: child.slug,
                                  description: child.description,
                                  isActive: child.isActive,
                                  sortOrder: child.sortOrder,
                                  iconKey: child.iconKey,
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

        {filtered.length > pageSize ? (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="text-xs tabular-nums text-[var(--muted)]">
              Page {safePage} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </AdminSection>

      <CategoryFormDialog
        open={dialog?.kind === 'form'}
        mode={dialog?.kind === 'form' ? dialog.mode : 'create-root'}
        roots={categories.data ?? []}
        initial={dialog?.kind === 'form' ? dialog.target : null}
        defaultParentId={dialog?.kind === 'form' ? dialog.parentId : undefined}
        allowIcon={scope === 'TOPIC'}
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
    </>
  );

  if (embedded) {
    return <div className="space-y-5">{body}</div>;
  }

  return <AdminPage>{body}</AdminPage>;
}

function SubcategoryRow({
  child,
  allowReorder,
  canMoveUp,
  canMoveDown,
  reorderPending,
  onMoveUp,
  onMoveDown,
  onEdit,
  onToggle,
  onDelete,
}: {
  child: AdminCategoryChild;
  allowReorder?: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  reorderPending?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-[var(--ink)]">{child.name}</p>
          <Badge variant={child.isActive ? 'success' : 'outline'}>
            {child.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-[var(--muted)]">
          {child.questionCount} question{child.questionCount === 1 ? '' : 's'}
        </p>
      </div>
      <AdminRowActions
        className="w-full justify-start sm:w-auto sm:justify-end [&_button]:min-h-10 sm:[&_button]:min-h-0"
        primary={
          <>
            {allowReorder ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  disabled={reorderPending || !canMoveUp}
                  aria-label={`Move ${child.name} up`}
                  onClick={onMoveUp}
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="cursor-pointer"
                  disabled={reorderPending || !canMoveDown}
                  aria-label={`Move ${child.name} down`}
                  onClick={onMoveDown}
                >
                  <ArrowDown className="size-3.5" />
                </Button>
              </>
            ) : null}
            <Button type="button" size="sm" variant="ghost" className="cursor-pointer" onClick={onEdit}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          </>
        }
      >
        <Button type="button" size="sm" variant="ghost" className="cursor-pointer" onClick={onToggle}>
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
