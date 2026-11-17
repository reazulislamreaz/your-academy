'use client';

import {
  HOMEPAGE_ICON_KEYS,
  HOMEPAGE_OTHERS_TILE_ID,
  HOMEPAGE_SECTION_PREVIEW_LIMIT,
  HOMEPAGE_TILE_LOGO_SIZE,
  isHomepageOthersTile,
} from '@your-academy/shared';
import { ImagePlus } from 'lucide-react';
import { AdminFormPanel } from '@/components/admin/admin-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { HomepageIcon } from '@/lib/homepage-icon-map';
import type { HomepageSectionKind, HomepageSectionTile } from './types';

type CategoryOption = { id: string; name: string; isActive?: boolean };
type ChildOption = { id: string; label: string; parentId: string };

type Props = {
  section: HomepageSectionKind;
  draftTile: HomepageSectionTile | null;
  logoPreview: string | null;
  uploadProgress: string | null;
  storageConfigured: boolean;
  categoryOptions?: CategoryOption[];
  childOptions?: ChildOption[];
  noun: string;
  onChange: (tile: HomepageSectionTile) => void;
  onLogoPick: (file: File | null) => void;
  onClearLogo: () => void;
  onApply: () => void;
  onCancel: () => void;
};

/** Shared details panel for editing a homepage title/topic tile. */
export function HomepageTileEditor({
  section,
  draftTile,
  logoPreview,
  uploadProgress,
  storageConfigured,
  categoryOptions = [],
  childOptions = [],
  noun,
  onChange,
  onLogoPick,
  onClearLogo,
  onApply,
  onCancel,
}: Props) {
  const editingOthers = draftTile ? isHomepageOthersTile(draftTile) : false;

  return (
    <AdminFormPanel
      title={
        draftTile
          ? editingOthers
            ? 'Edit Others'
            : `Edit ${noun}`
          : 'Details'
      }
      description={
        draftTile
          ? editingOthers
            ? `Fixed at #${HOMEPAGE_SECTION_PREVIEW_LIMIT}. Title and logo are editable.`
            : 'Changes apply to the draft. Publish to update the live homepage.'
          : `Select a Top ${HOMEPAGE_SECTION_PREVIEW_LIMIT - 1} item or promote from the library, then edit here.`
      }
      footer={
        draftTile ? (
          <>
            <Button type="button" size="sm" className="motion-press cursor-pointer" onClick={onApply}>
              Apply to draft
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="cursor-pointer"
              onClick={onCancel}
            >
              Cancel
            </Button>
          </>
        ) : undefined
      }
    >
      {draftTile ? (
        <div className="space-y-4">
          {editingOthers ? (
            <p className="rounded-[var(--radius)] border border-dashed border-[var(--highlight)]/40 bg-[var(--highlight-soft)]/30 px-3 py-2 text-xs font-medium text-[var(--highlight)]">
              Fixed position — #{HOMEPAGE_SECTION_PREVIEW_LIMIT}. Cannot be reordered or removed.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ht-title">Display title</Label>
            <Input
              id="ht-title"
              value={draftTile.displayTitle}
              onChange={(e) => onChange({ ...draftTile, displayTitle: e.target.value })}
              maxLength={200}
            />
          </div>

          {section === 'categories' && 'subtitle' in draftTile ? (
            <div className="space-y-2">
              <Label htmlFor="ht-subtitle">Subtitle (optional)</Label>
              <Input
                id="ht-subtitle"
                value={draftTile.subtitle ?? ''}
                onChange={(e) =>
                  onChange({ ...draftTile, subtitle: e.target.value } as HomepageSectionTile)
                }
                maxLength={200}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="ht-icon">Icon</Label>
            <Select
              id="ht-icon"
              value={draftTile.iconKey}
              onChange={(e) =>
                onChange({
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

          {!editingOthers ? (
            <div className="space-y-2">
              <Label htmlFor="ht-cat">
                {section === 'topics' ? 'Link to bank category (optional)' : 'Linked category'}
              </Label>
              <Select
                id="ht-cat"
                value={draftTile.categoryId ?? ''}
                onChange={(e) =>
                  onChange({
                    ...draftTile,
                    categoryId: e.target.value || null,
                  })
                }
              >
                <option value="">None</option>
                {categoryOptions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.isActive === false ? ' (inactive)' : ''}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          {section === 'topics' && !editingOthers && 'subcategoryId' in draftTile ? (
            <div className="space-y-2">
              <Label htmlFor="ht-sub">Link to bank subcategory (optional)</Label>
              <p className="text-xs text-[var(--muted)]">
                Navigation only — does not import taxonomy topics.
              </p>
              <Select
                id="ht-sub"
                value={draftTile.subcategoryId ?? ''}
                onChange={(e) => {
                  const subcategoryId = e.target.value || null;
                  const parent = childOptions.find((c) => c.id === subcategoryId);
                  onChange({
                    ...draftTile,
                    subcategoryId,
                    categoryId: parent?.parentId ?? draftTile.categoryId,
                  } as HomepageSectionTile);
                }}
              >
                <option value="">None</option>
                {childOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label>
              Logo ({HOMEPAGE_TILE_LOGO_SIZE}×{HOMEPAGE_TILE_LOGO_SIZE}px)
            </Label>
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
                Upload logo
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="sr-only"
                  disabled={!storageConfigured}
                  onChange={(e) => void onLogoPick(e.target.files?.[0] ?? null)}
                />
              </label>
              {(draftTile.logoAssetId || logoPreview) && (
                <Button type="button" size="sm" variant="ghost" onClick={onClearLogo}>
                  Remove logo
                </Button>
              )}
            </div>
            {uploadProgress ? (
              <p className="text-xs text-[var(--muted)]">{uploadProgress}</p>
            ) : null}
          </div>

          {!editingOthers ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draftTile.visible}
                onChange={(e) => onChange({ ...draftTile, visible: e.target.checked })}
              />
              Visible in homepage ordering
            </label>
          ) : (
            <p className="text-xs text-[var(--muted)]">
              Tile id stays <code className="font-mono">{HOMEPAGE_OTHERS_TILE_ID}</code> so position
              rules remain enforceable.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Positions 1–{HOMEPAGE_SECTION_PREVIEW_LIMIT - 1} are admin-managed. Position{' '}
          {HOMEPAGE_SECTION_PREVIEW_LIMIT} is always Others. Promote from the library, then publish
          when ready.
        </p>
      )}
    </AdminFormPanel>
  );
}
