'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  HOMEPAGE_ICON_KEYS,
  HOMEPAGE_SECTION_PREVIEW_LIMIT,
  HOMEPAGE_TILE_LOGO_SIZE,
  createDefaultHomepagePayload,
  type HomepagePayload,
} from '@your-academy/shared';
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  GripVertical,
  ImagePlus,
  Pencil,
  Save,
  Star,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { AdminFormPanel, AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import type { AdminCategoryChild, AdminCategoryNode } from '@/features/admin/categories/types';
import { apiFetch } from '@/lib/api/client';
import {
  getAdminHomepage,
  publishHomepage,
  saveHomepageDraft,
} from '@/lib/api/homepage';
import {
  assertHomepageTileLogoFile,
  getStorageStatus,
  sanitizeSvgFileIfNeeded,
  uploadViaSignedRequest,
} from '@/lib/cloudinary-upload';
import { HomepageIcon } from '@/lib/homepage-icon-map';
import {
  dbCategoryHref,
  dbSubcategoryHref,
  guessHomepageIconKey,
} from '@/lib/homepage-tile-links';
import { cn } from '@/lib/utils';

type CategoryTile = HomepagePayload['categories']['tiles'][number];

type CatalogItem =
  | { kind: 'root'; root: AdminCategoryNode }
  | { kind: 'child'; root: AdminCategoryNode; child: AdminCategoryChild };

function newTileId(): string {
  return `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isOthersTitle(title: string): boolean {
  return title.trim().toLowerCase() === 'others';
}

function visibleHomepageRank(tiles: CategoryTile[], tileId: string): number | null {
  let rank = 0;
  for (const tile of tiles) {
    if (!tile.visible || isOthersTitle(tile.displayTitle)) continue;
    rank += 1;
    if (tile.id === tileId) return rank;
  }
  return null;
}

function reorderToPosition<T>(list: T[], from: number, toPosition1Based: number): T[] {
  if (from < 0 || from >= list.length) return list;
  const to = Math.min(Math.max(toPosition1Based, 1), list.length) - 1;
  if (to === from) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function findLinkedTile(
  tiles: CategoryTile[],
  opts: { categoryId: string; subcategoryId?: string | null },
): CategoryTile | undefined {
  if (opts.subcategoryId) {
    return (
      tiles.find((t) => t.subcategoryId === opts.subcategoryId) ??
      tiles.find((t) => t.categoryId === opts.subcategoryId && !t.subcategoryId)
    );
  }
  return tiles.find((t) => t.categoryId === opts.categoryId && !t.subcategoryId);
}

function buildRootTile(root: AdminCategoryNode): CategoryTile {
  return {
    id: newTileId(),
    displayTitle: root.name,
    subtitle: '',
    iconKey: guessHomepageIconKey(root.name),
    categoryId: root.id,
    subcategoryId: null,
    fallbackHref: dbCategoryHref(root.id),
    visible: true,
    logoAssetId: null,
    logoUrl: null,
  };
}

function buildChildTile(root: AdminCategoryNode, child: AdminCategoryChild): CategoryTile {
  return {
    id: newTileId(),
    displayTitle: child.name,
    subtitle: root.name,
    iconKey: guessHomepageIconKey(child.name),
    categoryId: root.id,
    subcategoryId: child.id,
    fallbackHref: dbSubcategoryHref(root.id, child.id),
    visible: true,
    logoAssetId: null,
    logoUrl: null,
  };
}

/**
 * Dedicated Homepage Titles manager for Question Bank Categories.
 * Top 5 + full taxonomy catalog (every subcategory under its parent).
 */
export function HomepageTitlesManager() {
  const qc = useQueryClient();
  const [payload, setPayload] = useState<HomepagePayload>(createDefaultHomepagePayload);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null,
  );
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTile, setDraftTile] = useState<CategoryTile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const adminQ = useQuery({
    queryKey: ['admin-homepage'],
    queryFn: getAdminHomepage,
  });

  const categoriesQ = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => apiFetch<AdminCategoryNode[]>('/admin/categories'),
    staleTime: 60_000,
  });

  const storageQ = useQuery({
    queryKey: ['storage-status'],
    queryFn: getStorageStatus,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!adminQ.data) return;
    setPayload(adminQ.data.draft.payload);
    setDirty(false);
  }, [adminQ.data]);

  useEffect(() => {
    const roots = categoriesQ.data ?? [];
    if (roots.length === 0) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const root of roots) {
        if (next[root.id] === undefined) next[root.id] = true;
      }
      return next;
    });
  }, [categoriesQ.data]);

  const tiles = payload.categories.tiles;
  const roots = categoriesQ.data ?? [];

  const enriched = useMemo(() => {
    return tiles.map((tile, index) => {
      const rank = visibleHomepageRank(tiles, tile.id);
      const onHomepage = rank != null && rank <= HOMEPAGE_SECTION_PREVIEW_LIMIT;
      return { tile, index, rank, onHomepage };
    });
  }, [tiles]);

  const homepageTiles = useMemo(
    () => enriched.filter((e) => e.onHomepage).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    [enriched],
  );

  const tileByLink = useMemo(() => {
    const map = new Map<string, { tile: CategoryTile; rank: number | null; onHomepage: boolean }>();
    for (const e of enriched) {
      if (e.tile.subcategoryId) {
        map.set(`sub:${e.tile.subcategoryId}`, {
          tile: e.tile,
          rank: e.rank,
          onHomepage: e.onHomepage,
        });
      } else if (e.tile.categoryId) {
        map.set(`cat:${e.tile.categoryId}`, {
          tile: e.tile,
          rank: e.rank,
          onHomepage: e.onHomepage,
        });
      }
    }
    return map;
  }, [enriched]);

  // When searching, show matching children; otherwise every child under each parent.
  const catalogRoots = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('bn');
    if (!needle) return roots;
    return roots
      .map((root) => {
        const allChildren = root.children ?? [];
        const matchedChildren = allChildren.filter(
          (c) =>
            c.name.toLocaleLowerCase('bn').includes(needle) ||
            (c.description ?? '').toLocaleLowerCase('bn').includes(needle),
        );
        const rootMatch =
          root.name.toLocaleLowerCase('bn').includes(needle) ||
          (root.description ?? '').toLocaleLowerCase('bn').includes(needle);
        if (!rootMatch && matchedChildren.length === 0) return null;
        return {
          ...root,
          children: rootMatch ? allChildren : matchedChildren,
        };
      })
      .filter(Boolean) as AdminCategoryNode[];
  }, [roots, search]);

  useEffect(() => {
    if (!search.trim()) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const root of catalogRoots) {
        if (root.children.length > 0) next[root.id] = true;
      }
      return next;
    });
  }, [catalogRoots, search]);

  const patchTiles = (nextTiles: CategoryTile[]) => {
    setPayload((prev) => ({
      ...prev,
      categories: { ...prev.categories, tiles: nextTiles },
    }));
    setDirty(true);
  };

  const saveMut = useMutation({
    mutationFn: async (alsoPublish: boolean) => {
      await saveHomepageDraft({
        payload,
        heroImageAssetId: adminQ.data?.draft.heroImageAssetId ?? null,
      });
      if (alsoPublish) await publishHomepage();
    },
    onSuccess: async (_d, alsoPublish) => {
      setDirty(false);
      setMessage({
        tone: 'success',
        text: alsoPublish ? 'Saved and published to the live homepage.' : 'Draft saved.',
      });
      await qc.invalidateQueries({ queryKey: ['admin-homepage'] });
    },
    onError: (err) => {
      setMessage({
        tone: 'danger',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    },
  });

  const ensureAndPromote = (item: CatalogItem) => {
    const categoryId = item.root.id;
    const subcategoryId = item.kind === 'child' ? item.child.id : null;
    let next = [...tiles];
    let linked = findLinkedTile(next, { categoryId, subcategoryId });

    if (!linked) {
      const created =
        item.kind === 'child'
          ? buildChildTile(item.root, item.child)
          : buildRootTile(item.root);
      next.push(created);
      linked = created;
    } else if (!linked.visible) {
      next = next.map((t) => (t.id === linked!.id ? { ...t, visible: true } : t));
      linked = next.find((t) => t.id === linked!.id)!;
    }

    const index = next.findIndex((t) => t.id === linked!.id);
    // Place as the new #5 (or fill an empty Top 5 slot). Previous #5 drops to remaining.
    next = reorderToPosition(next, index, HOMEPAGE_SECTION_PREVIEW_LIMIT);
    patchTiles(next);
    setMessage({
      tone: 'success',
      text: `“${linked.displayTitle}” added to Homepage Top ${HOMEPAGE_SECTION_PREVIEW_LIMIT}. Save & publish when ready.`,
    });
  };

  const demoteFromHomepage = (index: number) => {
    patchTiles(reorderToPosition(tiles, index, HOMEPAGE_SECTION_PREVIEW_LIMIT + 1));
  };

  const moveHomepage = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= tiles.length) return;
    const next = [...tiles];
    const tmp = next[index]!;
    next[index] = next[target]!;
    next[target] = tmp;
    patchTiles(next);
  };

  const openEdit = (tile: CategoryTile) => {
    setDraftTile({ ...tile });
    setEditingId(tile.id);
    setLogoPreview(tile.logoUrl ?? null);
  };

  const commitDraft = () => {
    if (!draftTile) return;
    if (!draftTile.displayTitle.trim()) {
      setMessage({ tone: 'danger', text: 'Title is required' });
      return;
    }
    const exists = tiles.some((t) => t.id === draftTile.id);
    const next = exists
      ? tiles.map((t) => (t.id === draftTile.id ? draftTile : t))
      : [...tiles, draftTile];
    patchTiles(next);
    setDraftTile(null);
    setEditingId(null);
    setLogoPreview(null);
    setMessage({ tone: 'success', text: 'Title updated in draft.' });
  };

  const onLogoPick = async (file: File | null) => {
    if (!file || !draftTile) return;
    try {
      assertHomepageTileLogoFile(file);
      const safe = await sanitizeSvgFileIfNeeded(file);
      setUploadProgress('Uploading & optimizing…');
      const localUrl = URL.createObjectURL(safe);
      setLogoPreview(localUrl);
      const asset = await uploadViaSignedRequest('homepage-tile-logo', safe);
      setDraftTile({
        ...draftTile,
        logoAssetId: asset.id,
        logoUrl: localUrl,
      });
      setUploadProgress('Logo uploaded.');
      setTimeout(() => setUploadProgress(null), 2000);
    } catch (err) {
      setUploadProgress(null);
      setMessage({
        tone: 'danger',
        text: err instanceof Error ? err.message : 'Logo upload failed',
      });
    }
  };

  const clearLogo = () => {
    if (!draftTile) return;
    setDraftTile({
      ...draftTile,
      logoAssetId: null,
      logoUrl: null,
      logoWidth: null,
      logoHeight: null,
    });
    setLogoPreview(null);
  };

  const totalSubcategories = roots.reduce((n, r) => n + (r.children?.length ?? 0), 0);

  if (adminQ.isLoading) {
    return (
      <AdminPage dense>
        <PageHeader
          title="Question Bank Categories"
          description="Manage homepage titles and the Top 5 selection."
        />
        <div className="space-y-3" role="status" aria-busy="true" aria-label="Loading">
          <div className="h-16 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
          <div className="h-40 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
        </div>
      </AdminPage>
    );
  }

  return (
    <AdminPage dense>
      <PageHeader
        eyebrow="Homepage"
        title="Question Bank Categories"
        description="Select and reorder the Top 5 homepage titles. Promote any category or subcategory from the catalog below."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={!dirty || saveMut.isPending}
              onClick={() => saveMut.mutate(false)}
            >
              <Save className="h-4 w-4" />
              Draft
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate(true)}
            >
              <Upload className="h-4 w-4" />
              Publish
            </Button>
          </div>
        }
      />

      {message ? (
        <Alert variant={message.tone === 'success' ? 'success' : 'danger'}>{message.text}</Alert>
      ) : null}
      {dirty ? <Alert variant="warning">Unpublished draft changes.</Alert> : null}
      {storageQ.data && !storageQ.data.configured ? (
        <Alert variant="warning">Logo uploads need Cloudinary credentials.</Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[var(--muted)]">
        <span>
          <span className="tabular-nums text-[var(--ink)]">
            {homepageTiles.length}/{HOMEPAGE_SECTION_PREVIEW_LIMIT}
          </span>{' '}
          homepage
        </span>
        <span>
          <span className="tabular-nums text-[var(--ink)]">{roots.length}</span> categories
        </span>
        <span>
          <span className="tabular-nums text-[var(--ink)]">{totalSubcategories}</span>{' '}
          subcategories
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-md">
          <Label htmlFor="ht-heading" className="text-xs text-[var(--muted)]">
            Section heading
          </Label>
          <Input
            id="ht-heading"
            value={payload.categories.heading}
            onChange={(e) => {
              const heading = e.target.value;
              setPayload((prev) => ({
                ...prev,
                categories: { ...prev.categories, heading },
              }));
              setDirty(true);
            }}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={payload.categories.visible}
            onChange={(e) => {
              const visible = e.target.checked;
              setPayload((prev) => ({
                ...prev,
                categories: { ...prev.categories, visible },
              }));
              setDirty(true);
            }}
          />
          Visible on homepage
        </label>
      </div>

      {/* —— Section 1: Top 5 —— */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-base font-bold text-[var(--ink)]">
            Homepage Top {HOMEPAGE_SECTION_PREVIEW_LIMIT}
          </h2>
          <p className="text-xs text-[var(--muted)]">Drag to reorder</p>
        </div>

        {homepageTiles.length === 0 ? (
          <Surface className="p-5">
            <p className="text-sm text-[var(--muted)]">
              No homepage titles yet. Promote any category or subcategory from the catalog below.
            </p>
          </Surface>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {homepageTiles.map(({ tile, index, rank }) => (
              <li
                key={tile.id}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex === null || dragIndex === index) return;
                  const next = [...tiles];
                  const [item] = next.splice(dragIndex, 1);
                  next.splice(index, 0, item!);
                  patchTiles(next);
                  setDragIndex(null);
                }}
                className={cn(
                  'group flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 shadow-[var(--shadow-sm)]',
                  editingId === tile.id && 'ring-2 ring-[var(--highlight)]/30',
                )}
              >
                <GripVertical
                  className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--muted)] opacity-50 group-hover:opacity-100"
                  aria-hidden
                />
                <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-[var(--muted)]">
                  {rank}
                </span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-muted)]">
                  {tile.logoUrl ? (
                    <img src={tile.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                  ) : (
                    <HomepageIcon iconKey={tile.iconKey} className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">
                    {tile.displayTitle}
                  </p>
                  {tile.subtitle ? (
                    <p className="truncate text-[10px] text-[var(--muted)]">{tile.subtitle}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-0.5">
                  <button
                    type="button"
                    className="cursor-pointer text-[var(--muted)] hover:text-[var(--ink)]"
                    aria-label="Move up"
                    onClick={() => moveHomepage(index, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer text-[var(--muted)] hover:text-[var(--ink)]"
                    aria-label="Move down"
                    onClick={() => moveHomepage(index, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex shrink-0 flex-col gap-1">
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-medium text-[var(--muted)] hover:text-[var(--ink)]"
                    onClick={() => openEdit(tile)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-medium text-[var(--muted)] hover:text-[var(--danger)]"
                    onClick={() => demoteFromHomepage(index)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* —— Section 2: Catalog —— */}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]">
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-base font-bold text-[var(--ink)]">
                All titles & subcategories
              </h2>
              <p className="mt-0.5 text-sm text-[var(--muted)]">
                Every database subcategory under its parent. Promote any item into the Top{' '}
                {HOMEPAGE_SECTION_PREVIEW_LIMIT}.
              </p>
            </div>
            <div className="w-full sm:w-72">
              <SearchField
                id="ht-search"
                value={search}
                onChange={setSearch}
                placeholder="Search titles or subcategories…"
                aria-label="Search titles or subcategories"
              />
            </div>
          </div>

          {categoriesQ.isLoading ? (
            <div className="space-y-2" role="status" aria-busy="true">
              <div className="h-24 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
              <div className="h-24 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
            </div>
          ) : null}

          {categoriesQ.isError ? (
            <Alert variant="danger">Could not load categories from the database.</Alert>
          ) : null}

          {!categoriesQ.isLoading && catalogRoots.length === 0 ? (
            <EmptyState
              title={search ? 'No matches' : 'No categories yet'}
              description={
                search
                  ? 'Try a different search.'
                  : 'Create categories in Taxonomy first, then promote them here.'
              }
            />
          ) : null}

          <ul className="space-y-3">
            {catalogRoots.map((root) => {
              const isOpen = expanded[root.id] ?? true;
              const rootLink = tileByLink.get(`cat:${root.id}`);
              const children = root.children ?? [];

              return (
                <li key={root.id}>
                  <Surface elevated>
                    <div className="flex flex-wrap items-start gap-2 p-3.5 sm:gap-3 sm:p-4">
                      <button
                        type="button"
                        className="-m-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--muted)] hover:bg-[var(--bg-muted)]"
                        aria-expanded={isOpen}
                        aria-label={isOpen ? 'Collapse' : 'Expand'}
                        onClick={() =>
                          setExpanded((e) => ({ ...e, [root.id]: !isOpen }))
                        }
                      >
                        {isOpen ? (
                          <ChevronDown className="size-4" />
                        ) : (
                          <ChevronRight className="size-4" />
                        )}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-display text-base font-bold text-[var(--ink)]">
                            {root.name}
                          </h3>
                          {rootLink?.onHomepage ? (
                            <Badge variant="success">Homepage #{rootLink.rank}</Badge>
                          ) : rootLink ? (
                            <Badge variant="outline">In draft</Badge>
                          ) : null}
                          {!root.isActive ? <Badge variant="outline">Inactive</Badge> : null}
                        </div>
                        <p className="mt-1 text-xs text-[var(--muted)]">
                          {children.length} subcategor{children.length === 1 ? 'y' : 'ies'}
                          {' · '}
                          {root.questionCount} question{root.questionCount === 1 ? '' : 's'}
                        </p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {rootLink?.onHomepage ? (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(rootLink.tile)}
                            >
                              <Pencil className="size-3.5" />
                              Edit
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const idx = tiles.findIndex((t) => t.id === rootLink.tile.id);
                                if (idx >= 0) demoteFromHomepage(idx);
                              }}
                            >
                              Remove from Top {HOMEPAGE_SECTION_PREVIEW_LIMIT}
                            </Button>
                          </>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => ensureAndPromote({ kind: 'root', root })}
                          >
                            <Star className="size-3.5" />
                            Promote to Top {HOMEPAGE_SECTION_PREVIEW_LIMIT}
                          </Button>
                        )}
                      </div>
                    </div>

                    {isOpen ? (
                      <div className="rounded-b-[var(--radius-lg)] border-t border-[var(--line)] bg-[var(--bg-desk)] px-3 py-3 sm:px-4">
                        {children.length === 0 ? (
                          <p className="text-sm text-[var(--muted)]">No subcategories.</p>
                        ) : (
                          <ul className="space-y-2">
                            {children.map((child) => {
                              const link = tileByLink.get(`sub:${child.id}`);
                              return (
                                <li
                                  key={child.id}
                                  className={cn(
                                    'flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border px-3 py-2.5',
                                    link?.onHomepage
                                      ? 'border-[var(--highlight)]/35 bg-[var(--info-soft)]'
                                      : 'border-[var(--line)] bg-[var(--bg-elevated)]',
                                  )}
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="truncate text-sm font-semibold text-[var(--ink)]">
                                        {child.name}
                                      </p>
                                      {link?.onHomepage ? (
                                        <Badge variant="success">Homepage #{link.rank}</Badge>
                                      ) : link ? (
                                        <Badge variant="outline">In draft</Badge>
                                      ) : null}
                                      {!child.isActive ? (
                                        <Badge variant="outline">Inactive</Badge>
                                      ) : null}
                                    </div>
                                    <p className="mt-0.5 text-xs text-[var(--muted)]">
                                      {child.questionCount} question
                                      {child.questionCount === 1 ? '' : 's'}
                                    </p>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {link?.onHomepage ? (
                                      <>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => openEdit(link.tile)}
                                        >
                                          <Pencil className="size-3.5" />
                                          Edit
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => {
                                            const idx = tiles.findIndex(
                                              (t) => t.id === link.tile.id,
                                            );
                                            if (idx >= 0) demoteFromHomepage(idx);
                                          }}
                                        >
                                          Remove
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="secondary"
                                        onClick={() =>
                                          ensureAndPromote({ kind: 'child', root, child })
                                        }
                                      >
                                        <Star className="size-3.5" />
                                        Promote
                                      </Button>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </Surface>
                </li>
              );
            })}
          </ul>

          {search && catalogRoots.length > 0 ? (
            <p className="text-xs text-[var(--muted)]">
              Showing matches across {catalogRoots.length} categor
              {catalogRoots.length === 1 ? 'y' : 'ies'}.
            </p>
          ) : null}
        </section>

        <AdminFormPanel
          title={draftTile ? 'Edit title' : 'Details'}
          description={
            draftTile
              ? 'Changes apply to the draft. Publish to update the live homepage.'
              : 'Select a Top 5 title or promote an item, then edit its display.'
          }
        >
          {draftTile ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ht-title">Display title</Label>
                <Input
                  id="ht-title"
                  value={draftTile.displayTitle}
                  onChange={(e) =>
                    setDraftTile({ ...draftTile, displayTitle: e.target.value })
                  }
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ht-subtitle">Subtitle (optional)</Label>
                <Input
                  id="ht-subtitle"
                  value={draftTile.subtitle ?? ''}
                  onChange={(e) =>
                    setDraftTile({ ...draftTile, subtitle: e.target.value })
                  }
                  maxLength={200}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ht-icon">Icon</Label>
                <Select
                  id="ht-icon"
                  value={draftTile.iconKey}
                  onChange={(e) =>
                    setDraftTile({
                      ...draftTile,
                      iconKey: e.target.value as (typeof HOMEPAGE_ICON_KEYS)[number],
                    })
                  }
                >
                  {HOMEPAGE_ICON_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Logo ({HOMEPAGE_TILE_LOGO_SIZE}×{HOMEPAGE_TILE_LOGO_SIZE}px)</Label>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-md border border-[var(--line)] bg-[var(--bg-muted)]">
                    {logoPreview || draftTile.logoUrl ? (
                      <img
                        src={logoPreview || draftTile.logoUrl || ''}
                        alt=""
                        className="h-full w-full object-contain p-0.5"
                      />
                    ) : (
                      <HomepageIcon iconKey={draftTile.iconKey} className="h-5 w-5" />
                    )}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-[var(--highlight)]">
                    <ImagePlus className="h-4 w-4" />
                    Upload
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="sr-only"
                      onChange={(e) => void onLogoPick(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {(draftTile.logoAssetId || logoPreview) && (
                    <Button type="button" size="sm" variant="ghost" onClick={clearLogo}>
                      Remove
                    </Button>
                  )}
                </div>
                {uploadProgress ? (
                  <p className="text-xs text-[var(--muted)]">{uploadProgress}</p>
                ) : null}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draftTile.visible}
                  onChange={(e) =>
                    setDraftTile({ ...draftTile, visible: e.target.checked })
                  }
                />
                Visible
              </label>
              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="button" size="sm" onClick={commitDraft}>
                  Apply to draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setDraftTile(null);
                    setEditingId(null);
                    setLogoPreview(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Homepage shows the first {HOMEPAGE_SECTION_PREVIEW_LIMIT} visible titles. Promoting a
              new item into a full Top {HOMEPAGE_SECTION_PREVIEW_LIMIT} moves the previous fifth
              title into the remaining list. Database categories are never duplicated.
            </p>
          )}
        </AdminFormPanel>
      </div>
    </AdminPage>
  );
}
