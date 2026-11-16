'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowUp,
  Eye,
  EyeOff,
  GripVertical,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  HOMEPAGE_ICON_KEYS,
  HOMEPAGE_TILE_LOGO_SIZE,
  createDefaultHomepagePayload,
  type HomepagePayload,
} from '@your-academy/shared';
import { AdminPage } from '@/components/admin/admin-page';
import { PageHeader } from '@/components/layout/page-header';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Surface } from '@/components/ui/surface';
import { apiFetch } from '@/lib/api/client';
import {
  getAdminHomepage,
  publishHomepage,
  saveHomepageDraft,
} from '@/lib/api/homepage';
import type { CategoryNode } from '@/lib/api/types';
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

type Props = {
  section: SectionKind;
  title: string;
  description: string;
};

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

export function HomepageSectionManager({ section, title, description }: Props) {
  const qc = useQueryClient();
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

  const adminQ = useQuery({
    queryKey: ['admin-homepage'],
    queryFn: getAdminHomepage,
  });

  const categoriesQ = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiFetch<CategoryNode[]>('/categories'),
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
      section === 'categories'
        ? { ...base, subtitle: '' }
        : { ...base, subcategoryId: null };
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
    setMessage({ tone: 'success', text: exists ? 'Category updated in draft.' : 'Category added to draft.' });
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

  return (
    <AdminPage>
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Create category
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={!dirty || saveMut.isPending}
              onClick={() => saveMut.mutate(false)}
            >
              <Save className="h-4 w-4" />
              Save draft
            </Button>
            <Button
              type="button"
              disabled={saveMut.isPending}
              onClick={() => saveMut.mutate(true)}
            >
              <Upload className="h-4 w-4" />
              Save & publish
            </Button>
          </div>
        }
      />

      {message ? (
        <Alert variant={message.tone === 'success' ? 'success' : 'danger'} className="mb-4">
          {message.text}
        </Alert>
      ) : null}
      {dirty ? (
        <Alert variant="warning" className="mb-4">
          You have unpublished draft changes for this section.
        </Alert>
      ) : null}
      {storageQ.data && !storageQ.data.configured ? (
        <Alert variant="warning" className="mb-4">
          Cloudinary is not configured — logo uploads are disabled until storage credentials are set.
        </Alert>
      ) : null}

      <div className="mb-4 grid gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="section-heading">Section heading</Label>
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
        <div className="flex items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
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
            Section visible on homepage
          </label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Surface className="overflow-hidden p-0">
          <div className="border-b border-[var(--line)] px-4 py-3">
            <h2 className="font-display text-lg font-semibold">Categories ({tiles.length})</h2>
            <p className="text-sm text-[var(--muted)]">
              Drag rows or set position. Homepage shows the first 4 visible items, then Others.
            </p>
          </div>
          {tiles.length === 0 ? (
            <div className="p-8 text-center text-sm text-[var(--muted)]">
              No categories yet. Create one to get started.
            </div>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {tiles.map((tile, index) => (
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
                  className={cn(
                    'flex flex-wrap items-center gap-3 px-4 py-3 transition-colors',
                    editingId === tile.id && 'bg-[var(--info-soft)]',
                  )}
                >
                  <button
                    type="button"
                    className="cursor-grab text-[var(--muted)]"
                    aria-label="Drag to reorder"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <span className="w-8 text-center text-xs font-semibold text-[var(--muted)]">
                    {index + 1}
                  </span>
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg)]">
                    {tile.logoUrl ? (
                      <img src={tile.logoUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                      <HomepageIcon iconKey={tile.iconKey} className="h-8 w-8" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--ink)]">{tile.displayTitle}</p>
                    <p className="truncate text-xs text-[var(--muted)]">{tile.fallbackHref}</p>
                  </div>
                  <Badge variant={tile.visible ? 'success' : 'default'}>
                    {tile.visible ? 'Visible' : 'Hidden'}
                  </Badge>
                  <div className="flex flex-wrap items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Move up"
                      onClick={() => patchSection(moveItem(tiles, index, -1))}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label="Move down"
                      onClick={() => patchSection(moveItem(tiles, index, 1))}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Input
                      className="w-16"
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
                    <Button type="button" size="sm" variant="secondary" onClick={() => openEdit(tile)}>
                      Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        const next = tiles.map((t) =>
                          t.id === tile.id ? { ...t, visible: !t.visible } : t,
                        );
                        patchSection(next);
                      }}
                    >
                      {tile.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteId(tile.id)}
                    >
                      <Trash2 className="h-4 w-4 text-[var(--danger)]" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Surface>

        <Surface className="p-4">
          {draftTile ? (
            <div className="space-y-4">
              <h2 className="font-display text-lg font-semibold">
                {tiles.some((t) => t.id === draftTile.id) ? 'Edit category' : 'Create category'}
              </h2>
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
                <Label htmlFor="tile-href">Fallback link</Label>
                <Input
                  id="tile-href"
                  value={draftTile.fallbackHref}
                  onChange={(e) => setDraftTile({ ...draftTile, fallbackHref: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tile-icon">Fallback icon</Label>
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
                <Label htmlFor="tile-cat">Linked category (optional)</Label>
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
                  <option value="">— None —</option>
                  {roots.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </div>
              {section === 'topics' ? (
                <div>
                  <Label htmlFor="tile-sub">Linked subcategory (optional)</Label>
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
                    <option value="">— None —</option>
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
                <p className="text-xs text-[var(--muted)]">
                  Recommended {HOMEPAGE_TILE_LOGO_SIZE}×{HOMEPAGE_TILE_LOGO_SIZE}px (1:1). PNG, JPG,
                  WebP, or SVG up to 2MB. Other sizes are auto-fitted on the server.
                </p>
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg)]">
                    {logoPreview || draftTile.logoUrl ? (
                      <img
                        src={logoPreview || draftTile.logoUrl || ''}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ImagePlus className="h-8 w-8 text-[var(--muted)]" />
                    )}
                  </div>
                  <div className="space-y-2">
                    {(logoDims || (draftTile.logoWidth && draftTile.logoHeight)) && (
                      <p className="text-xs text-[var(--muted)]">
                        Current:{' '}
                        {logoDims
                          ? `${logoDims.w}×${logoDims.h}px`
                          : `${draftTile.logoWidth}×${draftTile.logoHeight}px`}
                      </p>
                    )}
                    {uploadProgress ? (
                      <p className="text-xs text-[var(--info)]">{uploadProgress}</p>
                    ) : null}
                    <Input
                      type="file"
                      accept=".png,.jpg,.jpeg,.webp,.svg,image/png,image/jpeg,image/webp,image/svg+xml"
                      disabled={!storageQ.data?.configured}
                      onChange={(e) => void onLogoPick(e.target.files?.[0] ?? null)}
                    />
                    {(draftTile.logoAssetId || logoPreview) && (
                      <Button type="button" size="sm" variant="secondary" onClick={clearLogo}>
                        Remove logo
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
                Visible on frontend
              </label>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button type="button" onClick={commitDraft}>
                  Apply to list
                </Button>
                <Button
                  type="button"
                  variant="secondary"
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
            <div className="space-y-3 text-sm text-[var(--muted)]">
              <h2 className="font-display text-lg font-semibold text-[var(--ink)]">Editor</h2>
              <p>Select a category to edit, or create a new one.</p>
              <p>
                Array order is the display order. Homepage shows the first 4 visible tiles plus
                Others. Others opens the full directory pages (DB categories/subcategories, or all
                topic tiles with logos). Publish to update the live site.
              </p>
            </div>
          )}
        </Surface>
      </div>

      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete category tile?"
        description="This removes the tile from the homepage section draft. Linked taxonomy categories are not deleted."
        confirmLabel="Delete"
        destructive
        onConfirm={() => deleteId && removeTile(deleteId)}
        onCancel={() => setDeleteId(null)}
      />
    </AdminPage>
  );
}
