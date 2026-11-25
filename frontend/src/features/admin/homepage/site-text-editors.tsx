'use client';

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

/**
 * DEC-069 — small editors for CMS text that used to be hard-coded (quick links, bullets,
 * tiles, labels). Pure controlled inputs; validation runs in the shared schema on save.
 */

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

function RowActions({
  index,
  count,
  label,
  onMove,
  onRemove,
}: {
  index: number;
  count: number;
  label: string;
  onMove: (to: number) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="flex shrink-0 gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
      >
        <ArrowUp className="size-4" aria-hidden />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        aria-label={`Move ${label} down`}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        <ArrowDown className="size-4" aria-hidden />
      </Button>
      {onRemove ? (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
        >
          <Trash2 className="size-4" aria-hidden />
        </Button>
      ) : null}
    </div>
  );
}

export function EditorGroup({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-3 rounded-[var(--radius-lg)] border border-[var(--line)] p-3 sm:p-4">
      <legend className="px-1 text-sm font-semibold text-[var(--ink)]">{title}</legend>
      {hint ? <p className="text-xs text-[var(--muted-strong)]">{hint}</p> : null}
      {children}
    </fieldset>
  );
}

/** Label + link rows (add / edit / reorder / remove). */
export function LinkListEditor({
  items,
  onChange,
  max,
  itemName = 'link',
}: {
  items: Array<{ label: string; href: string }>;
  onChange: (next: Array<{ label: string; href: string }>) => void;
  max: number;
  itemName?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            aria-label={`${itemName} ${i + 1} text`}
            value={item.label}
            placeholder="Text"
            maxLength={120}
            onChange={(e) =>
              onChange(items.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
            }
          />
          <Input
            aria-label={`${itemName} ${i + 1} link`}
            value={item.href}
            placeholder="/path or https://…"
            maxLength={500}
            onChange={(e) =>
              onChange(items.map((x, j) => (j === i ? { ...x, href: e.target.value } : x)))
            }
          />
          <RowActions
            index={i}
            count={items.length}
            label={`${itemName} ${i + 1}`}
            onMove={(to) => onChange(move(items, i, to))}
            onRemove={() => onChange(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={items.length >= max}
        onClick={() => onChange([...items, { label: '', href: '/' }])}
      >
        <Plus className="size-4" aria-hidden />
        Add {itemName}
      </Button>
    </div>
  );
}

/** Plain text rows (bullets). */
export function TextListEditor({
  items,
  onChange,
  max,
  itemName = 'line',
}: {
  items: string[];
  onChange: (next: string[]) => void;
  max: number;
  itemName?: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((line, i) => (
        <div key={i} className="flex items-center gap-2">
          <Input
            aria-label={`${itemName} ${i + 1}`}
            value={line}
            maxLength={500}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
          />
          <RowActions
            index={i}
            count={items.length}
            label={`${itemName} ${i + 1}`}
            onMove={(to) => onChange(move(items, i, to))}
            onRemove={() => onChange(items.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={items.length >= max}
        onClick={() => onChange([...items, ''])}
      >
        <Plus className="size-4" aria-hidden />
        Add {itemName}
      </Button>
    </div>
  );
}

/** A fixed set of named text fields (labels). */
export function LabelFieldsEditor<K extends string>({
  fields,
  values,
  onChange,
  multiline = [],
}: {
  fields: Array<{ key: K; label: string; hint?: string }>;
  values: Record<K, string>;
  onChange: (key: K, value: string) => void;
  multiline?: K[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => {
        const id = `site-text-${f.key}`;
        const wide = multiline.includes(f.key);
        return (
          <div key={f.key} className={wide ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
            <Label htmlFor={id}>{f.label}</Label>
            {wide ? (
              <Textarea
                id={id}
                rows={2}
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            ) : (
              <Input
                id={id}
                value={values[f.key] ?? ''}
                onChange={(e) => onChange(f.key, e.target.value)}
              />
            )}
            {f.hint ? <p className="text-xs text-[var(--muted)]">{f.hint}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
