'use client';

import {
  HOMEPAGE_EDITABLE_PREVIEW_SLOTS,
  HOMEPAGE_SECTION_PREVIEW_LIMIT,
  isHomepageOthersTile,
} from '@your-academy/shared';
import { ArrowDown, ArrowUp, GripVertical, Lock } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Stagger } from '@/components/motion/stagger';
import { HomepageIcon } from '@/lib/homepage-icon-map';
import { cn } from '@/lib/utils';
import type { HomepageSectionTile } from './types';

type Props = {
  topTiles: HomepageSectionTile[];
  othersTile: HomepageSectionTile | null;
  editingId: string | null;
  onReorder: (fromTopIndex: number, toTopIndex: number) => void;
  onMove: (topIndex: number, dir: -1 | 1) => void;
  onMoveToPosition: (tileId: string, position1Based: number) => void;
  onEdit: (tile: HomepageSectionTile) => void;
  onDemote: (tileId: string) => void;
};

/** Positions 1–4 (sortable) + fixed Others at #5. */
export function HomepageTopStrip({
  topTiles,
  othersTile,
  editingId,
  onReorder,
  onMove,
  onMoveToPosition,
  onEdit,
  onDemote,
}: Props) {
  const [dragTopIndex, setDragTopIndex] = useState<number | null>(null);
  const emptySlots = Math.max(0, HOMEPAGE_EDITABLE_PREVIEW_SLOTS - topTiles.length);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-bold text-[var(--ink)]">
            Homepage Top {HOMEPAGE_EDITABLE_PREVIEW_SLOTS}
          </h2>
          <p className="mt-0.5 text-sm text-[var(--muted)]">
            Drag to reorder, use arrows or the position menu, or Demote to the library. Others stays
            locked at #{HOMEPAGE_SECTION_PREVIEW_LIMIT}.
          </p>
        </div>
      </div>

      <Stagger
        stepMs={45}
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
        role="list"
        aria-label="Homepage top positions"
      >
        {topTiles.map((tile, topIndex) => (
          <div
            key={tile.id}
            role="listitem"
            draggable
            onDragStart={() => setDragTopIndex(topIndex)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragTopIndex === null || dragTopIndex === topIndex) return;
              onReorder(dragTopIndex, topIndex);
              setDragTopIndex(null);
            }}
            className={cn(
              'group flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] px-3 py-2.5 shadow-[var(--shadow-sm)] transition-[border-color,box-shadow,transform] duration-[var(--duration-fast)] hover:border-[var(--highlight)]/35 hover:shadow-[var(--shadow-md)]',
              editingId === tile.id && 'ring-2 ring-[var(--highlight)]/30',
              dragTopIndex === topIndex && 'scale-[0.98] opacity-80',
            )}
          >
            <GripVertical
              className="h-3.5 w-3.5 shrink-0 cursor-grab text-[var(--muted)] opacity-50 transition-opacity group-hover:opacity-100"
              aria-hidden
            />
            <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-[var(--muted)]">
              {topIndex + 1}
            </span>
            <TileThumb tile={tile} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">{tile.displayTitle}</p>
              {'subtitle' in tile && tile.subtitle ? (
                <p className="truncate text-[10px] text-[var(--muted)]">{tile.subtitle}</p>
              ) : null}
              <label className="mt-1 flex items-center gap-1 text-[10px] text-[var(--muted)]">
                <span className="sr-only">Move to position</span>
                <select
                  className="cursor-pointer rounded border border-[var(--line)] bg-[var(--bg-desk)] px-1 py-0.5 text-[10px] text-[var(--ink)]"
                  value={topIndex + 1}
                  aria-label={`Position for ${tile.displayTitle}`}
                  onChange={(e) => onMoveToPosition(tile.id, Number(e.target.value))}
                >
                  {topTiles.map((_, i) => (
                    <option key={i} value={i + 1}>
                      Pos {i + 1}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="flex shrink-0 flex-col gap-0.5">
              <button
                type="button"
                className="cursor-pointer text-[var(--muted)] transition-colors hover:text-[var(--ink)] disabled:opacity-30"
                aria-label="Move up"
                title="Move up"
                disabled={topIndex === 0}
                onClick={() => onMove(topIndex, -1)}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                className="cursor-pointer text-[var(--muted)] transition-colors hover:text-[var(--ink)] disabled:opacity-30"
                aria-label="Move down"
                title="Move down"
                disabled={topIndex >= topTiles.length - 1}
                onClick={() => onMove(topIndex, 1)}
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-auto px-1.5 py-0.5 text-xs"
                title="Edit title, logo, and settings"
                onClick={() => onEdit(tile)}
              >
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-auto px-1.5 py-0.5 text-xs text-[var(--danger)]"
                title="Demote to remaining list (does not delete)"
                onClick={() => onDemote(tile.id)}
              >
                Demote
              </Button>
            </div>
          </div>
        ))}

        {Array.from({ length: emptySlots }).map((_, i) => (
          <div
            key={`empty-${i}`}
            role="listitem"
            className="flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-dashed border-[var(--line)] bg-[var(--bg-muted)]/40 px-3 py-2.5"
          >
            <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-[var(--muted)]">
              {topTiles.length + i + 1}
            </span>
            <p className="text-xs text-[var(--muted)]">Empty — promote from the library</p>
          </div>
        ))}

        {othersTile ? (
          <div
            role="listitem"
            className={cn(
              'flex items-center gap-2.5 rounded-[var(--radius-lg)] border border-dashed border-[var(--highlight)]/45 bg-[var(--highlight-soft)]/35 px-3 py-2.5 transition-[box-shadow] duration-[var(--duration-fast)]',
              editingId === othersTile.id && 'ring-2 ring-[var(--highlight)]/30',
            )}
          >
            <Lock className="h-3.5 w-3.5 shrink-0 text-[var(--highlight)]" aria-hidden />
            <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-[var(--muted)]">
              {HOMEPAGE_SECTION_PREVIEW_LIMIT}
            </span>
            <TileThumb tile={othersTile} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-[var(--ink)]">
                {othersTile.displayTitle}
              </p>
              <p className="truncate text-[10px] font-medium text-[var(--highlight)]">
                Fixed position — #{HOMEPAGE_SECTION_PREVIEW_LIMIT}
              </p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-auto shrink-0 px-1.5 py-0.5 text-xs"
              title="Edit Others title and logo (position stays fixed)"
              onClick={() => onEdit(othersTile)}
            >
              Edit
            </Button>
          </div>
        ) : null}
      </Stagger>

      {topTiles.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          Promote up to {HOMEPAGE_EDITABLE_PREVIEW_SLOTS} items from the library below. Others always
          stays at #{HOMEPAGE_SECTION_PREVIEW_LIMIT}.
        </p>
      ) : null}
    </section>
  );
}

function TileThumb({ tile }: { tile: HomepageSectionTile }) {
  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-[var(--bg-muted)]">
      {tile.logoUrl ? (
        <img src={tile.logoUrl} alt="" className="h-full w-full object-contain p-0.5" />
      ) : (
        <HomepageIcon iconKey={tile.iconKey} className="h-4 w-4" />
      )}
    </div>
  );
}

export function isFixedOthersTile(tile: HomepageSectionTile): boolean {
  return isHomepageOthersTile(tile);
}
