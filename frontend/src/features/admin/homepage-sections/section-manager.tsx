'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  HOMEPAGE_ICON_KEYS,
  HOMEPAGE_SECTION_PREVIEW_LIMIT,
  HOMEPAGE_TILE_LOGO_SIZE,
  createDefaultHomepagePayload,
  type HomepagePayload,
} from '@your-academy/shared';
import { AdminFormPanel, AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchField } from '@/components/ui/search-field';
import { Select } from '@/components/ui/select';
import type { AdminCategoryNode } from '@/features/admin/categories/types';
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
import { cn } from '@/lib/utils';

export type SectionKind = 'categories' | 'topics';

type CategoryTile = HomepagePayload['categories']['tiles'][number];
type TopicTile = HomepagePayload['topics']['tiles'][number];
type AnyTile = CategoryTile | TopicTile;

type ListFilter = 'all' | 'homepage' | 'remaining' | 'visible' | 'hidden';
type PageSize = 10 | 20 | 50 | 100;

type Props = {
  section: SectionKind;
  title: string;
  description: string;
};

const PAGE_SIZES: PageSize[] = [10, 20, 50, 100];

function moveItem<T>(list: T[], index: number, dir: -1 | 1): T[] {
  const next = [...list];
  const j = index + dir;
  if (j < 0 || j >= next.length) return list;
  const tmp = next[index]!;
  next[index] = next[j]!;
  next[j] = tmp;
  return next;
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

function newTileId(): string {
  return `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isOthersTitle(title: string): boolean {
  return title.trim().toLowerCase() === 'others';
}

/** Rank among visible non-Others tiles (1..N). Null when hidden / Others. */
function visibleHomepageRank(tiles: AnyTile[], tileId: string): number | null {
  let rank = 0;
  for (const tile of tiles) {
    if (!tile.visible || isOthersTitle(tile.displayTitle)) continue;
    rank += 1;
    if (tile.id === tileId) return rank;
  }
  return null;
}

function preliHrefForName(name: string): string {
  return `/preli-question-bank?q=${encodeURIComponent(name)}`;
}

function buildCategoryTileFromRoot(root: AdminCategoryNode): CategoryTile {
  return {
    id: newTileId(),
    displayTitle: root.name,
    subtitle: '',
    iconKey: 'gov',
    categoryId: root.id,
    fallbackHref: preliHrefForName(root.name),
    visible: root.isActive,
    logoAssetId: null,
    logoUrl: null,
  };
}

/** Question-bank categories only — never auto-import taxonomy into Topics. */
function syncCategoryTilesFromTaxonomy(
  existing: AnyTile[],
  roots: AdminCategoryNode[],
): { tiles: AnyTile[]; added: number } {
  const linked = new Set(
    existing.map((t) => t.categoryId).filter((id): id is string => Boolean(id)),
  );
  const next = [...existing];
  let added = 0;
  for (const root of roots) {
    if (linked.has(root.id)) continue;
    next.push(buildCategoryTileFromRoot(root));
    linked.add(root.id);
    added += 1;
  }
  return { tiles: next, added };
}

export function HomepageSectionManager({ section, title, description }: Props) {
  const qc = useQueryClient();
  const noun = section === 'categories' ? 'category' : 'topic';
  const nounPlural = section === 'categories' ? 'categories' : 'topics';

  const [payload, setPayload] = useState<HomepagePayload>(createDefaultHomepagePayload);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(
    null,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTile, setDraftTile] = useState<AnyTile | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoDims, setLogoDims] = useState<{ w: number; h: number } | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ListFilter>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(20);

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
    setPage(1);
  }, [search, filter, pageSize, section]);

  const tiles: AnyTile[] =
    section === 'categories' ? payload.categories.tiles : payload.topics.tiles;
  const sectionMeta = section === 'categories' ? payload.categories : payload.topics;
  const roots = categoriesQ.data ?? [];

  const flatChildren = useMemo(
    () =>
      roots.flatMap((r) =>
        r.children.map((c) => ({
          id: c.id,
          label: `${r.name} › ${c.name}`,
          parentId: r.id,
        })),
      ),
    [roots],
  );

  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roots) {
      map.set(r.id, r.name);
      for (const c of r.children) map.set(c.id, `${r.name} › ${c.name}`);
    }
    return map;
  }, [roots]);

  /** Missing root categories not yet linked as tiles (categories section only). */
  const missingFromDb = useMemo(() => {
    if (section !== 'categories') return 0;
    const linked = new Set(tiles.map((t) => t.categoryId).filter(Boolean));
    return roots.filter((r) => !linked.has(r.id)).length;
  }, [roots, section, tiles]);

  const enriched = useMemo(() => {
    return tiles.map((tile, index) => {
      const rank = visibleHomepageRank(tiles, tile.id);
      const onHomepage = rank != null && rank <= HOMEPAGE_SECTION_PREVIEW_LIMIT;
      const inOthers =
        tile.visible && !isOthersTitle(tile.displayTitle) && rank != null && !onHomepage;
      return { tile, index, rank, onHomepage, inOthers };
    });
  }, [tiles]);

  const homepageTiles = useMemo(
    () => enriched.filter((e) => e.onHomepage).sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0)),
    [enriched],
  );

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('bn');
    return enriched.filter(({ tile, onHomepage, inOthers }) => {
      if (filter === 'homepage' && !onHomepage) return false;
      if (filter === 'remaining' && !inOthers) return false;
      if (filter === 'visible' && !tile.visible) return false;
      if (filter === 'hidden' && tile.visible) return false;
      if (!needle) return true;
      const linked =
        section === 'topics' && 'subcategoryId' in tile && tile.subcategoryId
          ? (categoryNameById.get(tile.subcategoryId) ?? '')
          : tile.categoryId
            ? (categoryNameById.get(tile.categoryId) ?? '')
            : '';
      const hay = [tile.displayTitle, 'subtitle' in tile ? (tile.subtitle ?? '') : '', linked, tile.fallbackHref]
        .join(' ')
        .toLocaleLowerCase('bn');
      return hay.includes(needle);
    });
  }, [categoryNameById, enriched, filter, search, section]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  const visibleCount = tiles.filter((t) => t.visible && !isOthersTitle(t.displayTitle)).length;
  const hiddenCount = tiles.filter((t) => !t.visible).length;
  const remainingCount = Math.max(0, visibleCount - homepageTiles.length);

  const patchSection = (nextTiles: AnyTile[]) => {
    setPayload((prev) => {
      if (section === 'categories') {
        return {
          ...prev,
          categories: { ...prev.categories, tiles: nextTiles as CategoryTile[] },
        };
      }
      return {
        ...prev,
        topics: { ...prev.topics, tiles: nextTiles as TopicTile[] },
      };
    });
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

  const syncFromDb = () => {
    if (section !== 'categories') return;
    const { tiles: next, added } = syncCategoryTilesFromTaxonomy(tiles, roots);
    if (added === 0) {
      setMessage({
        tone: 'success',
        text: 'All database categories are already in this list.',
      });
      return;
    }
    patchSection(next);
    setMessage({
      tone: 'success',
      text: `Added ${added} categor${added === 1 ? 'y' : 'ies'} from the database. Reorder, then save & publish.`,
    });
  };

  const promoteToHomepage = (index: number) => {
    patchSection(reorderToPosition(tiles, index, HOMEPAGE_SECTION_PREVIEW_LIMIT));
  };

  const demoteFromHomepage = (index: number) => {
    patchSection(reorderToPosition(tiles, index, HOMEPAGE_SECTION_PREVIEW_LIMIT + 1));
  };

  const openCreate = () => {
    const base = {
      id: newTileId(),
      displayTitle: '',
      iconKey: 'book' as const,
      fallbackHref: '/preli-question-bank',
      visible: true,
      logoAssetId: null,
      logoUrl: null,
      categoryId: null,
    };
    const tile: AnyTile =
      section === 'categories' ? { ...base, subtitle: '' } : { ...base, subcategoryId: null };
    setDraftTile(tile);
    setEditingId(tile.id);
    setLogoPreview(null);
    setLogoDims(null);
  };

  const openEdit = (tile: AnyTile) => {
    setDraftTile({ ...tile });
    setEditingId(tile.id);
    setLogoPreview(tile.logoUrl ?? null);
    setLogoDims(
      tile.logoWidth && tile.logoHeight ? { w: tile.logoWidth, h: tile.logoHeight } : null,
    );
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
    patchSection(next);
    setDraftTile(null);
    setEditingId(null);
    setLogoPreview(null);
    setMessage({
      tone: 'success',
      text: exists ? `${noun} updated in draft.` : `${noun} added to draft.`,
    });
  };

  const removeTile = (id: string) => {
    patchSection(tiles.filter((t) => t.id !== id));
    setDeleteId(null);
    if (editingId === id) {
      setDraftTile(null);
      setEditingId(null);
    }
  };

  const onLogoPick = async (file: File | null) => {
    if (!file || !draftTile) return;
    try {
      assertHomepageTileLogoFile(file);
      const safe = await sanitizeSvgFileIfNeeded(file);
      setUploadProgress('Uploading & optimizing…');
      const localUrl = URL.createObjectURL(safe);
      setLogoPreview(localUrl);
      const img = new Image();
      img.onload = () => setLogoDims({ w: img.naturalWidth, h: img.naturalHeight });
      img.src = localUrl;

      const asset = await uploadViaSignedRequest('homepage-tile-logo', safe);
      setDraftTile({
        ...draftTile,
        logoAssetId: asset.id,
        logoUrl: localUrl,
        logoWidth: logoDims?.w ?? null,
        logoHeight: logoDims?.h ?? null,
      });
      setUploadProgress('Logo uploaded. Backend will fit to 256×256.');
      setTimeout(() => setUploadProgress(null), 2500);
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
    setLogoDims(null);
  };

  const canDragList = !search.trim() && filter === 'all';

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const start = Math.max(1, Math.min(safePage - 2, totalPages - maxButtons + 1));
    return Array.from({ length: maxButtons }, (_, i) => start + i);
  }, [safePage, totalPages]);

  if (adminQ.isLoading) {
    return (
      <AdminPage dense>
        <PageHeader title={title} description={description} />
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
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {section === 'categories' ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={categoriesQ.isLoading || missingFromDb === 0}
                onClick={syncFromDb}
              >
                <RefreshCw className="h-4 w-4" />
                Sync{missingFromDb > 0 ? ` (${missingFromDb})` : ''}
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="ghost" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New
            </Button>
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
          <span className="tabular-nums text-[var(--ink)]">{tiles.length}</span> total
        </span>
        <span>
          <span className="tabular-nums text-[var(--ink)]">
            {homepageTiles.length}/{HOMEPAGE_SECTION_PREVIEW_LIMIT}
          </span>{' '}
          homepage
        </span>
        <span>
          <span className="tabular-nums text-[var(--ink)]">{remainingCount}</span> others
        </span>
        <span>
          <span className="tabular-nums text-[var(--ink)]">{hiddenCount}</span> hidden
        </span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 sm:max-w-sm">
          <Label htmlFor="section-heading" className="text-xs text-[var(--muted)]">
            Section heading
          </Label>
          <Input
            id="section-heading"
            value={sectionMeta.heading}
            onChange={(e) => {
              const heading = e.target.value;
              setPayload((prev) =>
                section === 'categories'
                  ? { ...prev, categories: { ...prev.categories, heading } }
                  : { ...prev, topics: { ...prev.topics, heading } },
              );
              setDirty(true);
            }}
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            checked={sectionMeta.visible}
            onChange={(e) => {
              const visible = e.target.checked;
              setPayload((prev) =>
                section === 'categories'
                  ? { ...prev, categories: { ...prev.categories, visible } }
                  : { ...prev, topics: { ...prev.topics, visible } },
              );
              setDirty(true);
            }}
          />
          Visible on homepage
        </label>
      </div>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-[var(--ink)]">
            Homepage top {HOMEPAGE_SECTION_PREVIEW_LIMIT}
          </h2>
          <p className="text-xs text-[var(--muted)]">Drag to reorder</p>
        </div>
        {homepageTiles.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No homepage tiles yet. Promote items from the list below.
          </p>
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
                  patchSection(next);
                  setDragIndex(null);
                }}
                className="group flex items-center gap-3 rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5"
              >
                <GripVertical
                  className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--muted)] opacity-50 group-hover:opacity-100"
                  aria-hidden
                />
                <span className="w-4 shrink-0 text-xs tabular-nums text-[var(--muted)]">{rank}</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-muted)]">
                  {tile.logoUrl ? (
                    <img src={tile.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
                  ) : (
                    <HomepageIcon iconKey={tile.iconKey} className="h-4 w-4" />
                  )}
                </div>
                <p className="min-w-0 flex-1 truncate text-sm text-[var(--ink)]">{tile.displayTitle}</p>
                <button
                  type="button"
                  className="shrink-0 text-xs text-[var(--muted)] hover:text-[var(--ink)]"
                  onClick={() => demoteFromHomepage(index)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <SearchField
                id="tile-search"
                value={search}
                onChange={setSearch}
                placeholder={`Search ${nounPlural}…`}
                aria-label={`Search ${nounPlural}`}
              />
            </div>
            <div className="flex gap-2">
              <Select
                aria-label="Filter list"
                value={filter}
                onChange={(e) => setFilter(e.target.value as ListFilter)}
                className="min-w-[8.5rem]"
              >
                <option value="all">All</option>
                <option value="homepage">Homepage</option>
                <option value="remaining">Others</option>
                <option value="visible">Visible</option>
                <option value="hidden">Hidden</option>
              </Select>
              <Select
                aria-label="Page size"
                value={String(pageSize)}
                onChange={(e) => setPageSize(Number(e.target.value) as PageSize)}
                className="min-w-[5.5rem]"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <p className="text-xs text-[var(--muted)]">
            {filtered.length} match{filtered.length === 1 ? '' : 'es'}
            {!canDragList ? ' · clear filters to drag-reorder' : ''}
          </p>

          {tiles.length === 0 ? (
            <EmptyState
              title={`No ${nounPlural} yet`}
              description={
                section === 'topics'
                  ? 'Add topics here manually. Nothing is imported from general categories.'
                  : 'Sync from the database or create a new tile.'
              }
              action={
                section === 'categories' ? (
                  <Button type="button" size="sm" variant="secondary" onClick={syncFromDb}>
                    <RefreshCw className="h-4 w-4" />
                    Sync
                  </Button>
                ) : (
                  <Button type="button" size="sm" variant="secondary" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    Add topic
                  </Button>
                )
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState title="No matches" description="Try a different search or filter." />
          ) : (
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {pageItems.map(({ tile, index, rank, onHomepage }) => {
                const linkedLabel =
                  section === 'topics' && 'subcategoryId' in tile && tile.subcategoryId
                    ? categoryNameById.get(tile.subcategoryId)
                    : tile.categoryId
                      ? categoryNameById.get(tile.categoryId)
                      : null;

                return (
                  <li
                    key={tile.id}
                    draggable={canDragList}
                    onDragStart={() => {
                      if (!canDragList) return;
                      setDragIndex(index);
                    }}
                    onDragOver={(e) => {
                      if (!canDragList) return;
                      e.preventDefault();
                    }}
                    onDrop={() => {
                      if (!canDragList || dragIndex === null || dragIndex === index) return;
                      const next = [...tiles];
                      const [item] = next.splice(dragIndex, 1);
                      next.splice(index, 0, item!);
                      patchSection(next);
                      setDragIndex(null);
                    }}
                    className={cn(
                      'flex items-center gap-2 py-2.5 sm:gap-3',
                      editingId === tile.id && 'bg-[var(--bg-muted)]/60',
                    )}
                  >
                    <button
                      type="button"
                      className="cursor-grab text-[var(--muted)] opacity-40 hover:opacity-100 disabled:cursor-not-allowed"
                      aria-label="Drag to reorder"
                      disabled={!canDragList}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <Input
                      className="h-8 w-12 px-1 text-center text-xs"
                      type="number"
                      min={1}
                      max={tiles.length}
                      value={index + 1}
                      aria-label="Position"
                      onChange={(e) => {
                        const pos = Number(e.target.value);
                        if (!Number.isFinite(pos)) return;
                        patchSection(reorderToPosition(tiles, index, pos));
                      }}
                    />
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-muted)]">
                      {tile.logoUrl ? (
                        <img src={tile.logoUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <HomepageIcon iconKey={tile.iconKey} className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-[var(--ink)]">{tile.displayTitle}</p>
                      <p className="truncate text-xs text-[var(--muted)]">
                        {onHomepage
                          ? `Homepage #${rank}`
                          : !tile.visible
                            ? 'Hidden'
                            : linkedLabel || 'Others'}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Move up"
                        onClick={() => patchSection(moveItem(tiles, index, -1))}
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        aria-label="Move down"
                        onClick={() => patchSection(moveItem(tiles, index, 1))}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      {!onHomepage && tile.visible && !isOthersTitle(tile.displayTitle) ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => promoteToHomepage(index)}
                        >
                          <Star className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">Top 5</span>
                        </Button>
                      ) : null}
                      {onHomepage ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => demoteFromHomepage(index)}
                        >
                          Remove
                        </Button>
                      ) : null}
                      <Button type="button" size="sm" variant="ghost" onClick={() => openEdit(tile)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          patchSection(
                            tiles.map((t) =>
                              t.id === tile.id ? { ...t, visible: !t.visible } : t,
                            ),
                          );
                        }}
                        aria-label={tile.visible ? 'Hide' : 'Show'}
                      >
                        {tile.visible ? (
                          <Eye className="h-3.5 w-3.5" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5" />
                        )}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteId(tile.id)}
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-[var(--danger)]" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {filtered.length > 0 && totalPages > 1 ? (
            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-xs tabular-nums text-[var(--muted)]">
                {safePage} / {totalPages}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {pageNumbers.map((n) => (
                  <Button
                    key={n}
                    type="button"
                    size="sm"
                    variant={n === safePage ? 'secondary' : 'ghost'}
                    className="min-w-8 tabular-nums"
                    onClick={() => setPage(n)}
                  >
                    {n}
                  </Button>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={safePage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        <AdminFormPanel
          title={
            draftTile
              ? tiles.some((t) => t.id === draftTile.id)
                ? `Edit ${noun}`
                : `New ${noun}`
              : 'Details'
          }
          description={draftTile ? undefined : `Select a ${noun} to edit.`}
          footer={
            draftTile ? (
              <>
                <Button type="button" size="sm" onClick={commitDraft}>
                  Apply
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
              </>
            ) : null
          }
        >
          {draftTile ? (
            <div className="space-y-3">
              <div>
                <Label htmlFor="tile-title">Name</Label>
                <Input
                  id="tile-title"
                  value={draftTile.displayTitle}
                  onChange={(e) => setDraftTile({ ...draftTile, displayTitle: e.target.value })}
                />
              </div>
              {section === 'categories' ? (
                <div>
                  <Label htmlFor="tile-subtitle">Subtitle</Label>
                  <Input
                    id="tile-subtitle"
                    value={'subtitle' in draftTile ? (draftTile.subtitle ?? '') : ''}
                    onChange={(e) =>
                      setDraftTile({ ...draftTile, subtitle: e.target.value } as CategoryTile)
                    }
                  />
                </div>
              ) : null}
              <div>
                <Label htmlFor="tile-href">Link</Label>
                <Input
                  id="tile-href"
                  value={draftTile.fallbackHref}
                  onChange={(e) => setDraftTile({ ...draftTile, fallbackHref: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tile-icon">Icon</Label>
                <Select
                  id="tile-icon"
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
              <div>
                <Label htmlFor="tile-cat">
                  {section === 'topics' ? 'Link to bank category (optional)' : 'Linked category'}
                </Label>
                <Select
                  id="tile-cat"
                  value={draftTile.categoryId ?? ''}
                  onChange={(e) =>
                    setDraftTile({
                      ...draftTile,
                      categoryId: e.target.value || null,
                    })
                  }
                >
                  <option value="">None</option>
                  {roots.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                      {!r.isActive ? ' (inactive)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              {section === 'topics' ? (
                <div>
                  <Label htmlFor="tile-sub">Link to bank subcategory (optional)</Label>
                  <p className="mb-1 text-xs text-[var(--muted)]">
                    Optional navigation only — does not import or list taxonomy topics.
                  </p>
                  <Select
                    id="tile-sub"
                    value={'subcategoryId' in draftTile ? (draftTile.subcategoryId ?? '') : ''}
                    onChange={(e) => {
                      const subcategoryId = e.target.value || null;
                      const parent = flatChildren.find((c) => c.id === subcategoryId);
                      setDraftTile({
                        ...draftTile,
                        subcategoryId,
                        categoryId: parent?.parentId ?? draftTile.categoryId,
                      } as TopicTile);
                    }}
                  >
                    <option value="">None</option>
                    {flatChildren.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-start gap-3">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-muted)]">
                    {logoPreview || draftTile.logoUrl ? (
                      <img
                        src={logoPreview || draftTile.logoUrl || ''}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImagePlus className="h-5 w-5 text-[var(--muted)]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    {uploadProgress ? (
                      <p className="text-xs text-[var(--muted)]">{uploadProgress}</p>
                    ) : (
                      <p className="text-xs text-[var(--muted)]">
                        {HOMEPAGE_TILE_LOGO_SIZE}×{HOMEPAGE_TILE_LOGO_SIZE}px
                      </p>
                    )}
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                      disabled={!storageQ.data?.configured}
                      onChange={(e) => void onLogoPick(e.target.files?.[0] ?? null)}
                    />
                    {(draftTile.logoAssetId || logoPreview) && (
                      <Button type="button" size="sm" variant="ghost" onClick={clearLogo}>
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draftTile.visible}
                  onChange={(e) => setDraftTile({ ...draftTile, visible: e.target.checked })}
                />
                Visible
              </label>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              {section === 'topics'
                ? `Only topics you add here appear on the site. General categories are never imported. Homepage shows the first ${HOMEPAGE_SECTION_PREVIEW_LIMIT} visible tiles.`
                : `Homepage shows the first ${HOMEPAGE_SECTION_PREVIEW_LIMIT} visible tiles. Everything else stays in this list for admin management.`}
            </p>
          )}
        </AdminFormPanel>
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={`Delete ${noun}?`}
        description={`Removes this tile from the homepage draft. Database ${nounPlural} are not deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteId && removeTile(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </AdminPage>
  );
}
