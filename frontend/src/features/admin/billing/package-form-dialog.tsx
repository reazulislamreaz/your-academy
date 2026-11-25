'use client';

import { useEffect, useState } from 'react';
import {
  PACKAGE_DURATION_LABELS,
  SELLABLE_PACKAGE_DURATIONS,
  type AdminSubscriptionPackageDto,
  type PackageDuration,
} from '@your-academy/shared';
import { Field, FieldHint } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { PackageInput } from '@/lib/api/admin-billing';

const PRICE_RE = /^\d{1,7}(\.\d{1,2})?$/;

type Draft = {
  name: string;
  duration: PackageDuration;
  priceBdt: string;
  discountedPriceBdt: string;
  isPopular: boolean;
  description: string;
  features: string;
  isActive: boolean;
  sortOrder: string;
};

function toDraft(pkg: AdminSubscriptionPackageDto | null): Draft {
  return {
    name: pkg?.name ?? '',
    duration: pkg?.duration ?? 'THREE_MONTHS',
    // "499.00" → "499" for editing; keep real decimals.
    priceBdt: pkg ? pkg.priceBdt.replace(/\.00$/, '') : '',
    discountedPriceBdt: pkg?.discountedPriceBdt?.replace(/\.00$/, '') ?? '',
    isPopular: pkg?.isPopular ?? false,
    description: pkg?.description ?? '',
    features: pkg?.features.join('\n') ?? '',
    isActive: pkg?.isActive ?? true,
    sortOrder: String(pkg?.sortOrder ?? 0),
  };
}

export function PackageFormDialog({
  open,
  pkg,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  /** null = create */
  pkg: AdminSubscriptionPackageDto | null;
  pending: boolean;
  error: string | null;
  onSubmit: (input: PackageInput) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(pkg));

  useEffect(() => {
    if (open) setDraft(toDraft(pkg));
  }, [open, pkg]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const price = draft.priceBdt.trim();
  const priceOk = PRICE_RE.test(price) && Number(price) >= 10;
  const discount = draft.discountedPriceBdt.trim();
  const discountOk =
    !discount ||
    (PRICE_RE.test(discount) &&
      Number(discount) >= 10 &&
      (!priceOk || Number(discount) < Number(price)));
  const sortOk = /^\d{1,5}$/.test(draft.sortOrder.trim());
  const nameOk = draft.name.trim().length >= 2;
  const valid = priceOk && discountOk && sortOk && nameOk;
  // A legacy Monthly package keeps its length unless the admin picks a new one (DEC-062).
  const durations = SELLABLE_PACKAGE_DURATIONS.includes(draft.duration)
    ? SELLABLE_PACKAGE_DURATIONS
    : [draft.duration, ...SELLABLE_PACKAGE_DURATIONS];

  return (
    <FormDialog
      open={open}
      title={pkg ? 'Edit package' : 'New package'}
      description="Shown on the public Packages page while active. Price changes never affect payments already started."
      confirmLabel={pkg ? 'Save changes' : 'Create package'}
      pending={pending}
      error={error}
      disableSubmit={!valid}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          name: draft.name.trim(),
          duration: draft.duration,
          priceBdt: price,
          discountedPriceBdt: discount || null,
          isPopular: draft.isPopular,
          description: draft.description.trim() || null,
          features: draft.features
            .split('\n')
            .map((f) => f.trim())
            .filter(Boolean),
          isActive: draft.isActive,
          sortOrder: Number(draft.sortOrder.trim()),
        })
      }
    >
      <Field>
        <Label htmlFor="pkg-name">Name</Label>
        <Input
          id="pkg-name"
          value={draft.name}
          maxLength={120}
          onChange={(e) => set('name', e.target.value)}
          required
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="pkg-duration">Duration</Label>
          <Select
            id="pkg-duration"
            className="h-10"
            value={draft.duration}
            onChange={(e) => set('duration', e.target.value as PackageDuration)}
          >
            {durations.map((d) => (
              <option key={d} value={d}>
                {PACKAGE_DURATION_LABELS[d]}
                {SELLABLE_PACKAGE_DURATIONS.includes(d) ? '' : ' (retired)'}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label htmlFor="pkg-price">Price (BDT)</Label>
          <Input
            id="pkg-price"
            inputMode="decimal"
            value={draft.priceBdt}
            placeholder="499"
            onChange={(e) => set('priceBdt', e.target.value)}
          />
          {!priceOk && price ? (
            <FieldHint className="text-[var(--danger-fg)]">
              Enter an amount of at least ৳10 (max 2 decimals).
            </FieldHint>
          ) : (
            <FieldHint>Minimum ৳10 (SSLCommerz limit).</FieldHint>
          )}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="pkg-discount">Discounted price (optional)</Label>
          <Input
            id="pkg-discount"
            inputMode="decimal"
            value={draft.discountedPriceBdt}
            placeholder="399"
            onChange={(e) => set('discountedPriceBdt', e.target.value)}
          />
          {!discountOk ? (
            <FieldHint className="text-[var(--danger-fg)]">
              Must be at least ৳10 and lower than the regular price.
            </FieldHint>
          ) : (
            <FieldHint>
              When set, learners pay this and see the regular price crossed out.
            </FieldHint>
          )}
        </Field>
        <Field>
          <Label htmlFor="pkg-popular">Badge</Label>
          <label className="flex h-10 items-center gap-2 text-sm text-[var(--ink)]">
            <input
              id="pkg-popular"
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={draft.isPopular}
              onChange={(e) => set('isPopular', e.target.checked)}
            />
            Recommended (highlighted on the homepage — only one package at a time)
          </label>
        </Field>
      </div>
      <Field>
        <Label htmlFor="pkg-description">Description (optional)</Label>
        <Textarea
          id="pkg-description"
          rows={2}
          maxLength={2000}
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </Field>
      <Field>
        <Label htmlFor="pkg-features">Features (one per line)</Label>
        <Textarea
          id="pkg-features"
          rows={4}
          value={draft.features}
          placeholder={'All Preli question sets\nAll Written question sets\nAll paid Model Tests'}
          onChange={(e) => set('features', e.target.value)}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <Label htmlFor="pkg-sort">Sort order</Label>
          <Input
            id="pkg-sort"
            inputMode="numeric"
            value={draft.sortOrder}
            onChange={(e) => set('sortOrder', e.target.value)}
          />
          <FieldHint>Lower numbers show first.</FieldHint>
        </Field>
        <Field>
          <Label htmlFor="pkg-active">Status</Label>
          <label className="flex h-10 items-center gap-2 text-sm text-[var(--ink)]">
            <input
              id="pkg-active"
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={draft.isActive}
              onChange={(e) => set('isActive', e.target.checked)}
            />
            Active (shown on the Packages page)
          </label>
        </Field>
      </div>
    </FormDialog>
  );
}
