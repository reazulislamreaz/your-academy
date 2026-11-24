'use client';

import { useState } from 'react';
import { PACKAGE_DURATION_LABELS, type AdminSubscriptionPackageDto } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Field, FieldHint } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { formatBdt, toDateInput } from './billing-format';

export type GrantInput = { packageId?: string; endsAt?: string; note?: string };

/** Make a user paid: add a package's duration, or set an exact end date. */
export function GrantDialog({
  open,
  packages,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  packages: AdminSubscriptionPackageDto[];
  pending: boolean;
  error: string | null;
  onSubmit: (input: GrantInput) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<'package' | 'date'>('package');
  const [packageId, setPackageId] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [note, setNote] = useState('');

  // Access lasts through the chosen local day.
  const endsAt = endsOn ? new Date(`${endsOn}T23:59:59`) : null;
  const valid =
    mode === 'package'
      ? Boolean(packageId)
      : endsAt !== null && !Number.isNaN(endsAt.getTime()) && endsAt.getTime() > Date.now();

  return (
    <FormDialog
      open={open}
      title="Grant subscription"
      description="Package: its duration is added to the current end date (or starts now if not subscribed). Custom date: the end date is set exactly."
      confirmLabel="Grant access"
      pending={pending}
      error={error}
      disableSubmit={!valid}
      onClose={onClose}
      onSubmit={() =>
        onSubmit({
          ...(mode === 'package' ? { packageId } : { endsAt: endsAt!.toISOString() }),
          ...(note.trim() ? { note: note.trim() } : {}),
        })
      }
    >
      <div className="flex gap-2" role="radiogroup" aria-label="Grant type">
        <Button
          type="button"
          size="sm"
          variant={mode === 'package' ? 'secondary' : 'outline'}
          aria-pressed={mode === 'package'}
          onClick={() => setMode('package')}
        >
          Package
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === 'date' ? 'secondary' : 'outline'}
          aria-pressed={mode === 'date'}
          onClick={() => setMode('date')}
        >
          Custom end date
        </Button>
      </div>
      {mode === 'package' ? (
        <Field>
          <Label htmlFor="grant-package">Package</Label>
          <Select
            id="grant-package"
            className="h-10"
            value={packageId}
            onChange={(e) => setPackageId(e.target.value)}
          >
            <option value="">Choose a package…</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {PACKAGE_DURATION_LABELS[p.duration]} · {formatBdt(p.priceBdt)}
                {p.isActive ? '' : ' (disabled)'}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field>
          <Label htmlFor="grant-ends">Access until</Label>
          <Input
            id="grant-ends"
            type="date"
            min={toDateInput(new Date())}
            value={endsOn}
            onChange={(e) => setEndsOn(e.target.value)}
          />
        </Field>
      )}
      <Field>
        <Label htmlFor="grant-note">Note (optional)</Label>
        <Textarea
          id="grant-note"
          rows={2}
          maxLength={500}
          value={note}
          placeholder="e.g. Paid via bKash, ref …"
          onChange={(e) => setNote(e.target.value)}
        />
        <FieldHint>Saved in the subscription log.</FieldHint>
      </Field>
    </FormDialog>
  );
}

const PRESET_DAYS = [7, 30, 90, 365] as const;

export function ExtendDialog({
  open,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  pending: boolean;
  error: string | null;
  onSubmit: (input: { days: number; note?: string }) => void;
  onClose: () => void;
}) {
  const [days, setDays] = useState('30');
  const [note, setNote] = useState('');
  const n = /^\d{1,4}$/.test(days.trim()) ? Number(days.trim()) : 0;
  const valid = n >= 1 && n <= 3650;

  return (
    <FormDialog
      open={open}
      title="Extend subscription"
      description="Adds days to the current end date (or from today if the subscription has ended). Also re-enables a disabled subscription."
      confirmLabel="Extend"
      pending={pending}
      error={error}
      disableSubmit={!valid}
      onClose={onClose}
      onSubmit={() => onSubmit({ days: n, ...(note.trim() ? { note: note.trim() } : {}) })}
    >
      <Field>
        <Label htmlFor="extend-days">Days</Label>
        <Input
          id="extend-days"
          inputMode="numeric"
          value={days}
          onChange={(e) => setDays(e.target.value)}
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Quick durations">
          {PRESET_DAYS.map((d) => (
            <Button
              key={d}
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDays(String(d))}
            >
              {d} days
            </Button>
          ))}
        </div>
        <FieldHint>1 – 3650 days.</FieldHint>
      </Field>
      <Field>
        <Label htmlFor="extend-note">Note (optional)</Label>
        <Textarea
          id="extend-note"
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </FormDialog>
  );
}
