'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createDefaultHomepagePayload,
  createDefaultOthersCategoryTile,
  createDefaultOthersTopicTile,
  demoteTileFromHomepageTop,
  isHomepageOthersTile,
  normalizeHomepageSectionTiles,
  promoteTileIntoHomepageTop,
  moveHomepageTopTileToPosition,
  reorderHomepageTopTiles,
  splitHomepageSectionTiles,
  HOMEPAGE_OTHERS_TILE_ID,
  type HomepagePayload,
} from '@your-academy/shared';
import { useEffect, useMemo, useState } from 'react';
import {
  getAdminHomepage,
  publishHomepage,
  saveHomepageDraft,
} from '@/lib/api/homepage';
import { revalidateHomepageCache } from '@/lib/api/revalidate-homepage';
import {
  assertHomepageTileLogoFile,
  getStorageStatus,
  sanitizeSvgFileIfNeeded,
  uploadViaSignedRequest,
} from '@/lib/cloudinary-upload';
import {
  isCategoryLikeSection,
  type BannerMessage,
  type HomepageSectionKind,
  type HomepageSectionTile,
} from './types';

function createOthers(section: HomepageSectionKind, payload: HomepagePayload) {
  if (section === 'categories') {
    return () =>
      createDefaultOthersCategoryTile(
        payload.categories.cta.href || '/question-bank-categories',
      );
  }
  if (section === 'writtenCategories') {
    return () =>
      createDefaultOthersCategoryTile(
        payload.writtenCategories.cta.href || '/written-question-bank-categories',
      );
  }
  return () =>
    createDefaultOthersTopicTile(payload.topics.cta.href || '/topic-categories');
}

function readTiles(section: HomepageSectionKind, payload: HomepagePayload): HomepageSectionTile[] {
  if (section === 'categories') return payload.categories.tiles;
  if (section === 'writtenCategories') return payload.writtenCategories.tiles;
  return payload.topics.tiles;
}

function writeTiles(
  section: HomepageSectionKind,
  payload: HomepagePayload,
  tiles: HomepageSectionTile[],
): HomepagePayload {
  if (section === 'categories') {
    return {
      ...payload,
      categories: {
        ...payload.categories,
        tiles: tiles as HomepagePayload['categories']['tiles'],
      },
    };
  }
  if (section === 'writtenCategories') {
    return {
      ...payload,
      writtenCategories: {
        ...payload.writtenCategories,
        tiles: tiles as HomepagePayload['writtenCategories']['tiles'],
      },
    };
  }
  return {
    ...payload,
    topics: {
      ...payload.topics,
      tiles: tiles as HomepagePayload['topics']['tiles'],
    },
  };
}

function readSectionMeta(section: HomepageSectionKind, payload: HomepagePayload) {
  if (section === 'categories') return payload.categories;
  if (section === 'writtenCategories') return payload.writtenCategories;
  return payload.topics;
}

/** Shared draft/publish/normalize/top-4 logic for homepage section pages. */
export function useHomepageSection(section: HomepageSectionKind) {
  const qc = useQueryClient();
  const [payload, setPayload] = useState<HomepagePayload>(createDefaultHomepagePayload);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<BannerMessage>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTile, setDraftTile] = useState<HomepageSectionTile | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const adminQ = useQuery({
    queryKey: ['admin-homepage'],
    queryFn: getAdminHomepage,
  });

  const storageQ = useQuery({
    queryKey: ['storage-status'],
    queryFn: getStorageStatus,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!adminQ.data) return;
    const next = adminQ.data.draft.payload;
    const tiles = normalizeHomepageSectionTiles(
      readTiles(section, next),
      createOthers(section, next),
    );
    setPayload(writeTiles(section, next, tiles));
    setDirty(false);
  }, [adminQ.data, section]);

  const tiles = readTiles(section, payload);
  const sectionMeta = readSectionMeta(section, payload);
  const othersFactory = createOthers(section, payload);

  const { top: topTiles, others: othersTile, rest: restTiles } = useMemo(
    () => splitHomepageSectionTiles(tiles),
    [tiles],
  );

  const patchTiles = (nextTiles: HomepageSectionTile[]) => {
    const normalized = normalizeHomepageSectionTiles(nextTiles, othersFactory);
    setPayload((prev) => writeTiles(section, prev, normalized));
    setDirty(true);
  };

  const patchSectionMeta = (patch: {
    heading?: string;
    visible?: boolean;
    subtitle?: string;
    subheading?: string;
  }) => {
    setPayload((prev) => {
      if (isCategoryLikeSection(section)) {
        const key = section;
        return {
          ...prev,
          [key]: {
            ...prev[key],
            ...(patch.heading !== undefined ? { heading: patch.heading } : {}),
            ...(patch.visible !== undefined ? { visible: patch.visible } : {}),
            ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
          },
        };
      }
      return {
        ...prev,
        topics: {
          ...prev.topics,
          ...(patch.heading !== undefined ? { heading: patch.heading } : {}),
          ...(patch.visible !== undefined ? { visible: patch.visible } : {}),
          ...(patch.subheading !== undefined ? { subheading: patch.subheading } : {}),
          ...(patch.subtitle !== undefined ? { subtitle: patch.subtitle } : {}),
        },
      };
    });
    setDirty(true);
  };

  const saveMut = useMutation({
    mutationFn: async (alsoPublish: boolean) => {
      const normalized = normalizeHomepageSectionTiles(tiles, othersFactory);
      const nextPayload = writeTiles(section, payload, normalized);
      await saveHomepageDraft({
        payload: nextPayload,
        heroImageAssetId: adminQ.data?.draft.heroImageAssetId ?? null,
      });
      if (alsoPublish) {
        await publishHomepage();
        const cache = await revalidateHomepageCache();
        return { alsoPublish: true as const, cacheOk: cache.ok, cacheDetail: cache.detail };
      }
      return { alsoPublish: false as const, cacheOk: true as boolean, cacheDetail: undefined as string | undefined };
    },
    onSuccess: async (result) => {
      setDirty(false);
      if (!result.alsoPublish) {
        setMessage({
          tone: 'success',
          text: 'Draft saved. Public site unchanged until you publish.',
        });
      } else if (result.cacheOk) {
        setMessage({
          tone: 'success',
          text: 'Saved and published. Live homepage updated — reload the homepage to confirm.',
        });
      } else {
        setMessage({
          tone: 'success',
          text: `Published to the database. Homepage cache refresh lagged (${result.cacheDetail ?? 'unknown'}) — hard-refresh the homepage in a minute if needed.`,
        });
      }
      await qc.invalidateQueries({ queryKey: ['admin-homepage'] });
    },
    onError: (err) => {
      setMessage({
        tone: 'danger',
        text: err instanceof Error ? err.message : 'Save failed',
      });
    },
  });

  const promote = (tileId: string, insertAt?: number) => {
    if (tileId === HOMEPAGE_OTHERS_TILE_ID) return;
    patchTiles(promoteTileIntoHomepageTop(tiles, tileId, othersFactory, insertAt));
    setMessage({
      tone: 'success',
      text:
        insertAt === undefined
          ? 'Promoted into the Top 4. Save draft or publish when ready.'
          : `Promoted to position ${insertAt + 1}. Save draft or publish when ready.`,
    });
  };

  const demote = (tileId: string) => {
    if (tileId === HOMEPAGE_OTHERS_TILE_ID || isHomepageOthersTile({ id: tileId, displayTitle: '' })) {
      setMessage({
        tone: 'danger',
        text: 'Others is fixed at position 5 and cannot be demoted.',
      });
      return;
    }
    patchTiles(demoteTileFromHomepageTop(tiles, tileId, othersFactory));
    setMessage({
      tone: 'success',
      text: 'Demoted from Top 4 into the remaining list.',
    });
  };

  const reorderTop = (from: number, to: number) => {
    patchTiles(reorderHomepageTopTiles(tiles, from, to, othersFactory));
  };

  const moveTop = (topIndex: number, dir: -1 | 1) => {
    const target = topIndex + dir;
    if (target < 0 || target >= topTiles.length) return;
    reorderTop(topIndex, target);
  };

  const moveTopToPosition = (tileId: string, position1Based: number) => {
    if (tileId === HOMEPAGE_OTHERS_TILE_ID) return;
    patchTiles(moveHomepageTopTileToPosition(tiles, tileId, position1Based, othersFactory));
  };

  const openEdit = (tile: HomepageSectionTile) => {
    setDraftTile({ ...tile });
    setEditingId(tile.id);
    setLogoPreview(tile.logoUrl ?? null);
  };

  const cancelEdit = () => {
    setDraftTile(null);
    setEditingId(null);
    setLogoPreview(null);
  };

  const commitDraft = () => {
    if (!draftTile) return;
    if (!draftTile.displayTitle.trim()) {
      setMessage({ tone: 'danger', text: 'Title is required' });
      return;
    }
    const editingOthers = isHomepageOthersTile(draftTile);
    const nextTile: HomepageSectionTile = editingOthers
      ? { ...draftTile, id: HOMEPAGE_OTHERS_TILE_ID, visible: true }
      : draftTile;
    const exists = tiles.some((t) => t.id === nextTile.id);
    const next = exists
      ? tiles.map((t) => (t.id === nextTile.id ? nextTile : t))
      : [...tiles, nextTile];
    patchTiles(next);
    cancelEdit();
    setMessage({ tone: 'success', text: 'Updated in draft.' });
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

  return {
    adminQ,
    storageQ,
    payload,
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
  };
}
