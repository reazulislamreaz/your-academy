'use client';

import { useQuery } from '@tanstack/react-query';
import {
  HOMEPAGE_EDITABLE_PREVIEW_SLOTS,
  HOMEPAGE_SECTION_PREVIEW_LIMIT,
  createDefaultOthersCategoryTile,
  createDefaultOthersTopicTile,
  isHomepageOthersTile,
  promoteTileIntoHomepageTop,
} from '@your-academy/shared';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Reveal } from '@/components/motion/reveal';
import { Stagger } from '@/components/motion/stagger';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchField } from '@/components/ui/search-field';
import { Surface } from '@/components/ui/surface';
import type { AdminCategoryChild, AdminCategoryNode } from '@/features/admin/categories/types';
import { apiFetch } from '@/lib/api/client';
import {
  ALL_TOPICS_PATH,
  QUESTION_BANK_CATEGORIES_PATH,
  WRITTEN_SUBCATEGORIES_PATH,
  dbCategoryHref,
  dbSubcategoryHref,
  dbWrittenCategoryHref,
  dbWrittenSubcategoryHref,
  guessHomepageIconKey,
} from '@/lib/homepage-tile-links';
import { cn } from '@/lib/utils';
import { HomepagePublishControls } from './shared/homepage-publish-controls';
import { HomepageTileEditor } from './shared/homepage-tile-editor';
import { HomepageTopStrip } from './shared/homepage-top-strip';
import {
  isCategoryLikeSection,
  type CategoryTile,
  type HomepageSectionKind,
  type HomepageSectionTile,
  type TopicTile,
} from './shared/types';
import { useHomepageSection } from './shared/use-homepage-section';

type Props = {
  section: HomepageSectionKind;
  title: string;
  description: string;
  eyebrow?: string;
};

function newTileId(): string {
  return `tile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Unified homepage titles workspace for Question Bank Categories,
 * Written Bank Categories, and Topic Based Question Analysis —
 * identical chrome; libraries are scope-isolated (Preli vs Written).
 */
export function HomepageSectionWorkspace({
  section,
  title,
  description,
  eyebrow = 'Homepage',
}: Props) {
  const categoryLike = isCategoryLikeSection(section);
  const noun = categoryLike ? 'category' : 'topic';
  const taxonomyScope = section === 'writtenCategories' ? 'WRITTEN' : 'PRELIMINARY';
  const othersFallbackHref =
    section === 'writtenCategories'
      ? WRITTEN_SUBCATEGORIES_PATH
      : QUESTION_BANK_CATEGORIES_PATH;
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const {
    adminQ,
    storageQ,
    tiles,
    sectionMeta,
    topTiles,
    othersTile,
    restTiles,
    dirty,
    message,
    setMessage,
    editingId,
    draftTile,
    setDraftTile,
    uploadProgress,
    logoPreview,
    saveMut,
    patchTiles,
    patchSectionMeta,
    promote,
    demote,
    reorderTop,
    moveTop,
    moveTopToPosition,
    openEdit,
    cancelEdit,
    commitDraft,
    onLogoPick,
    clearLogo,
  } = useHomepageSection(section);

  const categoriesQ = useQuery({
    queryKey: ['admin-categories', taxonomyScope],
    queryFn: () =>
      apiFetch<AdminCategoryNode[]>(`/admin/categories?scope=${taxonomyScope}`),
    staleTime: 60_000,
    enabled: true,
  });

  const roots = categoriesQ.data ?? [];

  useEffect(() => {
    if (roots.length === 0) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const root of roots) {
        if (next[root.id] === undefined) next[root.id] = true;
      }
      return next;
    });
  }, [roots]);

  const flatChildren = useMemo(
    () =>
      roots.flatMap((r) =>
        (r.children ?? []).map((c) => ({
          id: c.id,
          label: `${r.name} › ${c.name}`,
          parentId: r.id,
        })),
      ),
    [roots],
  );

  const topIds = useMemo(() => new Set(topTiles.map((t) => t.id)), [topTiles]);

  const tileByLink = useMemo(() => {
    const map = new Map<string, { tile: HomepageSectionTile; rank: number | null; onHomepage: boolean }>();
    topTiles.forEach((tile, i) => {
      const entry = { tile, rank: i + 1, onHomepage: true };
      if ('subcategoryId' in tile && tile.subcategoryId) {
        map.set(`sub:${tile.subcategoryId}`, entry);
      } else if (tile.categoryId) {
        map.set(`cat:${tile.categoryId}`, entry);
      }
    });
    for (const tile of [...restTiles, ...tiles]) {
      if (isHomepageOthersTile(tile) || topIds.has(tile.id)) continue;
      const entry = { tile, rank: null as number | null, onHomepage: false };
      if ('subcategoryId' in tile && tile.subcategoryId) {
        if (!map.has(`sub:${tile.subcategoryId}`)) map.set(`sub:${tile.subcategoryId}`, entry);
      } else if (tile.categoryId && !map.has(`cat:${tile.categoryId}`)) {
        map.set(`cat:${tile.categoryId}`, entry);
      }
    }
    return map;
  }, [restTiles, tiles, topIds, topTiles]);

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
        return { ...root, children: rootMatch ? allChildren : matchedChildren };
      })
      .filter(Boolean) as AdminCategoryNode[];
  }, [roots, search]);

  useEffect(() => {
    if (!search.trim() || !categoryLike) return;
    setExpanded((prev) => {
      const next = { ...prev };
      for (const root of catalogRoots) {
        if (root.children.length > 0) next[root.id] = true;
      }
      return next;
    });
  }, [catalogRoots, categoryLike, search]);

  const topicLibrary = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('bn');
    return tiles.filter((t) => {
      if (isHomepageOthersTile(t)) return false;
      if (!needle) return true;
      return (
        t.displayTitle.toLocaleLowerCase('bn').includes(needle) ||
        ('subtitle' in t && (t.subtitle ?? '').toLocaleLowerCase('bn').includes(needle))
      );
    });
  }, [search, tiles]);

  const findLinked = (opts: {
    categoryId: string;
    subcategoryId?: string | null;
  }): HomepageSectionTile | undefined => {
    if (opts.subcategoryId) {
      return (
        tiles.find(
          (t) => 'subcategoryId' in t && t.subcategoryId === opts.subcategoryId,
        ) ??
        tiles.find((t) => t.categoryId === opts.subcategoryId && !('subcategoryId' in t && t.subcategoryId))
      );
    }
    return tiles.find(
      (t) =>
        t.categoryId === opts.categoryId &&
        !('subcategoryId' in t && t.subcategoryId),
    );
  };

  const promoteCategoryItem = (
    root: AdminCategoryNode,
    child?: AdminCategoryChild,
    insertAt?: number,
  ) => {
    const categoryId = root.id;
    const subcategoryId = child?.id ?? null;
    let next = [...tiles];
    let linked = findLinked({ categoryId, subcategoryId });

    if (!linked) {
      const created: CategoryTile = child
        ? {
            id: newTileId(),
            displayTitle: child.name,
            subtitle: root.name,
            iconKey: guessHomepageIconKey(child.name),
            categoryId: root.id,
            subcategoryId: child.id,
            fallbackHref:
              section === 'writtenCategories'
                ? dbWrittenSubcategoryHref(root.id, child.id)
                : dbSubcategoryHref(root.id, child.id),
            visible: true,
            logoAssetId: null,
            logoUrl: null,
          }
        : {
            id: newTileId(),
            displayTitle: root.name,
            subtitle: '',
            iconKey: guessHomepageIconKey(root.name),
            categoryId: root.id,
            subcategoryId: null,
            fallbackHref:
              section === 'writtenCategories'
                ? dbWrittenCategoryHref(root.id)
                : dbCategoryHref(root.id),
            visible: true,
            logoAssetId: null,
            logoUrl: null,
          };
      // New tiles start after Others so promote can pull them into Top without
      // accidentally treating them as already in Top 4.
      const othersIdx = next.findIndex((t) => isHomepageOthersTile(t));
      if (othersIdx >= 0) next.splice(othersIdx + 1, 0, created);
      else next.push(created);
      linked = created;
    } else if (!linked.visible) {
      next = next.map((t) => (t.id === linked!.id ? { ...t, visible: true } : t));
      linked = next.find((t) => t.id === linked!.id)!;
    }

    next = promoteTileIntoHomepageTop(
      next,
      linked.id,
      () =>
        categoryLike
          ? createDefaultOthersCategoryTile(othersFallbackHref)
          : createDefaultOthersTopicTile(ALL_TOPICS_PATH),
      insertAt,
    );
    patchTiles(next);
    const positionLabel =
      insertAt === undefined ? `Top ${HOMEPAGE_EDITABLE_PREVIEW_SLOTS}` : `position ${insertAt + 1}`;
    setMessage({
      tone: 'success',
      text: `“${linked.displayTitle}” promoted to ${positionLabel}. Others stays at #${HOMEPAGE_SECTION_PREVIEW_LIMIT}.`,
    });
  };

  const addTopic = () => {
    const tile: TopicTile = {
      id: newTileId(),
      displayTitle: '',
      iconKey: 'book',
      fallbackHref: '/preli-question-bank',
      visible: true,
      logoAssetId: null,
      logoUrl: null,
      categoryId: null,
      subcategoryId: null,
    };
    openEdit(tile);
  };

  const removeTilePermanently = (id: string) => {
    if (isHomepageOthersTile({ id, displayTitle: '' })) {
      setMessage({
        tone: 'danger',
        text: 'Others is fixed at position 5 and cannot be deleted.',
      });
      setDeleteId(null);
      return;
    }
    patchTiles(tiles.filter((t) => t.id !== id));
    setDeleteId(null);
    if (editingId === id) cancelEdit();
    setMessage({ tone: 'success', text: `${noun} removed from draft.` });
  };

  const totalSubcategories = roots.reduce((n, r) => n + (r.children?.length ?? 0), 0);

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
      <Reveal>
        <PageHeader
          eyebrow={eyebrow}
          title={title}
          description={description}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {section === 'topics' ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="motion-press cursor-pointer"
                  title="Create a new topic tile"
                  onClick={addTopic}
                >
                  <Plus className="h-4 w-4" />
                  Add topic
                </Button>
              ) : null}
              <HomepagePublishControls
                dirty={dirty}
                pending={saveMut.isPending}
                onSaveDraft={() => saveMut.mutate(false)}
                onPublish={() => saveMut.mutate(true)}
              />
            </div>
          }
        />
      </Reveal>

      {message ? (
        <Reveal delayMs={20}>
          <Alert variant={message.tone === 'success' ? 'success' : 'danger'}>
            <div className="flex items-start justify-between gap-3">
              <span>{message.text}</span>
              <button
                type="button"
                className="cursor-pointer text-xs font-semibold underline-offset-2 hover:underline"
                onClick={() => setMessage(null)}
              >
                Dismiss
              </button>
            </div>
          </Alert>
        </Reveal>
      ) : null}
      {dirty ? (
        <Alert variant="warning">Unpublished draft changes — save draft or publish when ready.</Alert>
      ) : null}
      {storageQ.data && !storageQ.data.configured ? (
        <Alert variant="warning">Logo uploads need Cloudinary credentials.</Alert>
      ) : null}

      <Reveal delayMs={40}>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-[var(--muted)]">
          <span>
            <span className="tabular-nums text-[var(--ink)]">
              {topTiles.length}/{HOMEPAGE_EDITABLE_PREVIEW_SLOTS}
            </span>{' '}
            editable + Others #{HOMEPAGE_SECTION_PREVIEW_LIMIT}
          </span>
          {categoryLike ? (
            <>
              <span>
                <span className="tabular-nums text-[var(--ink)]">{roots.length}</span> categories
              </span>
              <span>
                <span className="tabular-nums text-[var(--ink)]">{totalSubcategories}</span>{' '}
                subcategories
              </span>
            </>
          ) : (
            <span>
              <span className="tabular-nums text-[var(--ink)]">
                {tiles.filter((t) => !isHomepageOthersTile(t)).length}
              </span>{' '}
              topics in draft
            </span>
          )}
        </div>
      </Reveal>

      <Reveal delayMs={55}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 sm:max-w-md">
            <Label htmlFor="hs-heading" className="text-xs text-[var(--muted)]">
              Section heading
            </Label>
            <Input
              id="hs-heading"
              value={sectionMeta.heading}
              onChange={(e) => patchSectionMeta({ heading: e.target.value })}
            />
          </div>
          {categoryLike ? (
            <div className="min-w-0 flex-1 sm:max-w-md">
              <Label htmlFor="hs-subtitle" className="text-xs text-[var(--muted)]">
                Section subtitle
              </Label>
              <Input
                id="hs-subtitle"
                value={
                  'subtitle' in sectionMeta ? String(sectionMeta.subtitle ?? '') : ''
                }
                onChange={(e) => patchSectionMeta({ subtitle: e.target.value })}
              />
            </div>
          ) : null}
          <label className="flex items-center gap-2 pb-2 text-sm text-[var(--ink)]">
            <input
              type="checkbox"
              checked={sectionMeta.visible}
              onChange={(e) => patchSectionMeta({ visible: e.target.checked })}
            />
            Visible on homepage
          </label>
        </div>
      </Reveal>

      <Reveal delayMs={70}>
        <HomepageTopStrip
          topTiles={topTiles}
          othersTile={othersTile}
          editingId={editingId}
          onReorder={reorderTop}
          onMove={moveTop}
          onMoveToPosition={moveTopToPosition}
          onEdit={openEdit}
          onDemote={demote}
        />
      </Reveal>

      <Reveal delayMs={90}>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(17rem,22rem)]">
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-base font-bold text-[var(--ink)]">
                  {categoryLike ? 'All titles & subcategories' : 'Topic library'}
                </h2>
                <p className="mt-0.5 text-sm text-[var(--muted)]">
                  {categoryLike
                    ? `Promote any ${section === 'writtenCategories' ? 'Written ' : ''}category or subcategory into positions 1–${HOMEPAGE_EDITABLE_PREVIEW_SLOTS}.`
                    : `Add topics manually, then promote into positions 1–${HOMEPAGE_EDITABLE_PREVIEW_SLOTS}.`}
                </p>
              </div>
              <div className="w-full sm:w-72">
                <SearchField
                  id="hs-search"
                  value={search}
                  onChange={setSearch}
                  placeholder={
                    categoryLike
                      ? 'Search titles or subcategories…'
                      : 'Search topics…'
                  }
                  aria-label={
                    categoryLike
                      ? 'Search titles or subcategories'
                      : 'Search topics'
                  }
                />
              </div>
            </div>

            {categoryLike ? (
              <>
                {restTiles.length > 0 ? (
                  <RemainingTilesList
                    tiles={restTiles}
                    search={search}
                    editingId={editingId}
                    onPromote={promote}
                    onEdit={openEdit}
                    onDelete={(id) => setDeleteId(id)}
                  />
                ) : null}
                <CategoriesLibrary
                  loading={categoriesQ.isLoading}
                  error={categoriesQ.isError}
                  roots={catalogRoots}
                  search={search}
                  expanded={expanded}
                  setExpanded={setExpanded}
                  tileByLink={tileByLink}
                  onPromote={promoteCategoryItem}
                  onEdit={openEdit}
                  onDemote={demote}
                />
              </>
            ) : (
              <TopicsLibrary
                items={topicLibrary}
                topIds={topIds}
                search={search}
                editingId={editingId}
                onAdd={addTopic}
                onPromote={promote}
                onDemote={demote}
                onEdit={openEdit}
                onDelete={(id) => setDeleteId(id)}
              />
            )}
          </section>

          <HomepageTileEditor
            section={section}
            draftTile={draftTile}
            logoPreview={logoPreview}
            uploadProgress={uploadProgress}
            storageConfigured={Boolean(storageQ.data?.configured)}
            categoryOptions={roots.map((r) => ({
              id: r.id,
              name: r.name,
              isActive: r.isActive,
            }))}
            childOptions={flatChildren}
            noun={noun}
            onChange={setDraftTile}
            onLogoPick={onLogoPick}
            onClearLogo={clearLogo}
            onApply={commitDraft}
            onCancel={cancelEdit}
          />
        </div>
      </Reveal>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title={`Delete ${noun}?`}
        description={`Removes this ${noun} from the homepage draft. Database records are not deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteId && removeTilePermanently(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </AdminPage>
  );
}

function RemainingTilesList({
  tiles,
  search,
  editingId,
  onPromote,
  onEdit,
  onDelete,
}: {
  tiles: HomepageSectionTile[];
  search: string;
  editingId: string | null;
  onPromote: (id: string, insertAt?: number) => void;
  onEdit: (tile: HomepageSectionTile) => void;
  onDelete: (id: string) => void;
}) {
  const needle = search.trim().toLocaleLowerCase('bn');
  const items = tiles.filter((t) => {
    if (isHomepageOthersTile(t)) return false;
    if (!needle) return true;
    return (
      t.displayTitle.toLocaleLowerCase('bn').includes(needle) ||
      ('subtitle' in t && (t.subtitle ?? '').toLocaleLowerCase('bn').includes(needle))
    );
  });
  if (items.length === 0) return null;

  return (
    <section className="space-y-2 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-muted)]/30 p-3">
      <div>
        <h3 className="text-sm font-bold text-[var(--ink)]">Remaining (not in Top 4)</h3>
        <p className="text-xs text-[var(--muted)]">
          Demoted or extra tiles. Promote any of these into positions 1–
          {HOMEPAGE_EDITABLE_PREVIEW_SLOTS}.
        </p>
      </div>
      <Stagger stepMs={30} className="space-y-1.5" role="list">
        {items.map((tile) => (
          <div
            key={tile.id}
            role="listitem"
            className={cn(
              'flex flex-wrap items-center gap-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2',
              editingId === tile.id && 'ring-2 ring-[var(--highlight)]/30',
            )}
          >
            <p className="min-w-0 flex-1 truncate text-sm font-semibold text-[var(--ink)]">
              {tile.displayTitle}
            </p>
            <LibraryActions
              compact
              onHomepage={false}
              onPromote={(insertAt) => onPromote(tile.id, insertAt)}
            />
            <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(tile)}>
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-[var(--danger)]"
              onClick={() => onDelete(tile.id)}
            >
              Delete
            </Button>
          </div>
        ))}
      </Stagger>
    </section>
  );
}

function CategoriesLibrary({
  loading,
  error,
  roots,
  search,
  expanded,
  setExpanded,
  tileByLink,
  onPromote,
  onEdit,
  onDemote,
}: {
  loading: boolean;
  error: boolean;
  roots: AdminCategoryNode[];
  search: string;
  expanded: Record<string, boolean>;
  setExpanded: Dispatch<SetStateAction<Record<string, boolean>>>;
  tileByLink: Map<
    string,
    { tile: HomepageSectionTile; rank: number | null; onHomepage: boolean }
  >;
  onPromote: (
    root: AdminCategoryNode,
    child?: AdminCategoryChild,
    insertAt?: number,
  ) => void;
  onEdit: (tile: HomepageSectionTile) => void;
  onDemote: (tileId: string) => void;
}) {
  if (loading) {
    return (
      <div className="space-y-2" role="status" aria-busy="true">
        <div className="h-24 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
        <div className="h-24 animate-pulse rounded-lg bg-[var(--bg-muted)]" />
      </div>
    );
  }
  if (error) {
    return <Alert variant="danger">Could not load categories from the database.</Alert>;
  }
  if (roots.length === 0) {
    return (
      <EmptyState
        title={search ? 'No matches' : 'No categories yet'}
        description={
          search
            ? 'Try a different search.'
            : 'Create categories in Taxonomy first, then promote them here.'
        }
      />
    );
  }

  return (
    <Stagger stepMs={40} className="space-y-3" role="list">
      {roots.map((root) => {
        const isOpen = expanded[root.id] ?? true;
        const rootLink = tileByLink.get(`cat:${root.id}`);
        const children = root.children ?? [];
        return (
          <Surface key={root.id} elevated role="listitem" className="overflow-hidden transition-shadow duration-[var(--duration-fast)] hover:shadow-[var(--shadow-md)]">
            <div className="flex flex-wrap items-start gap-2 p-3.5 sm:gap-3 sm:p-4">
              <button
                type="button"
                className="-m-1 flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-[8px] text-[var(--muted)] transition-colors hover:bg-[var(--bg-muted)]"
                aria-expanded={isOpen}
                aria-label={isOpen ? 'Collapse' : 'Expand'}
                onClick={() => setExpanded((e) => ({ ...e, [root.id]: !isOpen }))}
              >
                {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
              </button>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-base font-bold text-[var(--ink)]">{root.name}</h3>
                  {rootLink?.onHomepage ? (
                    <Badge variant="success">Homepage #{rootLink.rank}</Badge>
                  ) : rootLink ? (
                    <Badge variant="outline">In draft</Badge>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {children.length} subcategor{children.length === 1 ? 'y' : 'ies'}
                </p>
              </div>
              <LibraryActions
                onHomepage={Boolean(rootLink?.onHomepage)}
                onPromote={(insertAt) => onPromote(root, undefined, insertAt)}
                onEdit={rootLink ? () => onEdit(rootLink.tile) : undefined}
                onDemote={rootLink ? () => onDemote(rootLink.tile.id) : undefined}
              />
            </div>
            {isOpen ? (
              <div className="border-t border-[var(--line)] bg-[var(--bg-desk)] px-3 py-3 sm:px-4">
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
                            'flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius)] border px-3 py-2.5 transition-colors',
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
                            </div>
                          </div>
                          <LibraryActions
                            compact
                            onHomepage={Boolean(link?.onHomepage)}
                            onPromote={(insertAt) => onPromote(root, child, insertAt)}
                            onEdit={link ? () => onEdit(link.tile) : undefined}
                            onDemote={link ? () => onDemote(link.tile.id) : undefined}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            ) : null}
          </Surface>
        );
      })}
    </Stagger>
  );
}

function TopicsLibrary({
  items,
  topIds,
  search,
  editingId,
  onAdd,
  onPromote,
  onDemote,
  onEdit,
  onDelete,
}: {
  items: HomepageSectionTile[];
  topIds: Set<string>;
  search: string;
  editingId: string | null;
  onAdd: () => void;
  onPromote: (id: string, insertAt?: number) => void;
  onDemote: (id: string) => void;
  onEdit: (tile: HomepageSectionTile) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title={search ? 'No matches' : 'No topics yet'}
        description={
          search
            ? 'Try a different search.'
            : 'Add topics manually. Nothing is imported from general categories.'
        }
        action={
          !search ? (
            <Button type="button" size="sm" className="motion-press cursor-pointer" onClick={onAdd}>
              <Plus className="h-4 w-4" />
              Add topic
            </Button>
          ) : undefined
        }
      />
    );
  }

  return (
    <Stagger stepMs={35} className="divide-y divide-[var(--line)] border-y border-[var(--line)]" role="list">
      {items.map((tile) => {
        const onHomepage = topIds.has(tile.id);
        return (
          <div
            key={tile.id}
            role="listitem"
            className={cn(
              'flex flex-wrap items-center gap-2 py-2.5 transition-colors sm:gap-3',
              editingId === tile.id && 'bg-[var(--bg-muted)]/60',
              onHomepage && 'bg-[var(--info-soft)]/40',
            )}
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">{tile.displayTitle}</p>
                {onHomepage ? <Badge variant="success">On homepage</Badge> : null}
                {!tile.visible ? <Badge variant="outline">Hidden</Badge> : null}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {onHomepage ? (
                <Button type="button" size="sm" variant="ghost" onClick={() => onDemote(tile.id)}>
                  Demote
                </Button>
              ) : (
                <LibraryActions
                  compact
                  onHomepage={false}
                  onPromote={(insertAt) => onPromote(tile.id, insertAt)}
                />
              )}
              <Button type="button" size="sm" variant="ghost" onClick={() => onEdit(tile)}>
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="text-[var(--danger)]"
                title="Delete from draft"
                onClick={() => onDelete(tile.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        );
      })}
    </Stagger>
  );
}

function LibraryActions({
  onHomepage,
  onPromote,
  onEdit,
  onDemote,
  compact,
}: {
  onHomepage: boolean;
  onPromote: (insertAt?: number) => void;
  onEdit?: () => void;
  onDemote?: () => void;
  compact?: boolean;
}) {
  if (onHomepage) {
    return (
      <div className="flex flex-wrap gap-1.5">
        {onEdit ? (
          <Button type="button" size="sm" variant={compact ? 'ghost' : 'outline'} onClick={onEdit}>
            Edit
          </Button>
        ) : null}
        {onDemote ? (
          <Button type="button" size="sm" variant="ghost" onClick={onDemote}>
            Demote
          </Button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="motion-press cursor-pointer"
        title={`Promote to Top ${HOMEPAGE_EDITABLE_PREVIEW_SLOTS} (fills an empty slot, or inserts at #1 when full)`}
        onClick={() => onPromote()}
      >
        <Star className="size-3.5" />
        Promote
      </Button>
      <select
        className="h-8 cursor-pointer rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-elevated)] px-1.5 text-xs text-[var(--ink)]"
        defaultValue=""
        aria-label="Promote to a specific Top 4 position"
        title="Promote to a specific position"
        onChange={(e) => {
          const value = e.target.value;
          e.target.value = '';
          if (!value) return;
          onPromote(Number(value));
        }}
      >
        <option value="" disabled>
          To #
        </option>
        {Array.from({ length: HOMEPAGE_EDITABLE_PREVIEW_SLOTS }).map((_, i) => (
          <option key={i} value={i}>
            #{i + 1}
          </option>
        ))}
      </select>
    </div>
  );
}
