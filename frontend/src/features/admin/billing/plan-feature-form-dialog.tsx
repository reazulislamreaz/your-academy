'use client';

import { useEffect, useState } from 'react';
import {
  PLAN_FEATURE_LABEL_MAX,
  PLAN_FEATURE_PLACEHOLDERS,
  resolvePlanFeatureLabel,
  type AdminPlanFeatureDto,
  type PlanFeaturePlaceholderValues,
  type PlanKey,
} from '@your-academy/shared';
import { Field, FieldHint } from '@/components/ui/field';
import { FormDialog } from '@/components/ui/form-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export type PlanFeatureFormValues = {
  planKey: PlanKey;
  label: string;
  isIncluded: boolean;
  isActive: boolean;
};

/** DEC-065 — add / edit one Free vs Paid row (display only). */
export function PlanFeatureFormDialog({
  open,
  feature,
  defaultPlan,
  placeholderValues,
  pending,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  /** null = create */
  feature: AdminPlanFeatureDto | null;
  defaultPlan: PlanKey;
  placeholderValues: PlanFeaturePlaceholderValues | null;
  pending: boolean;
  error: string | null;
  onSubmit: (values: PlanFeatureFormValues) => void;
  onClose: () => void;
}) {
  const [values, setValues] = useState<PlanFeatureFormValues>({
    planKey: defaultPlan,
    label: '',
    isIncluded: true,
    isActive: true,
  });

  // Reset only when the dialog opens or switches feature (not on every parent render).
  const featureId = feature?.id ?? null;
  useEffect(() => {
    if (!open) return;
    setValues({
      planKey: feature?.planKey ?? defaultPlan,
      label: feature?.label ?? '',
      isIncluded: feature?.isIncluded ?? true,
      isActive: feature?.isActive ?? true,
    });
  }, [open, featureId, defaultPlan]);

  const label = values.label.trim();
  const tooLong = label.length > PLAN_FEATURE_LABEL_MAX;
  const preview =
    placeholderValues && /\{\w+\}/.test(label)
      ? resolvePlanFeatureLabel(label, placeholderValues)
      : null;

  return (
    <FormDialog
      open={open}
      title={feature ? 'Edit feature' : 'New feature'}
      description="Shown on the homepage Free / Paid cards. Display only — it does not change what anyone can open."
      confirmLabel={feature ? 'Save changes' : 'Add feature'}
      pending={pending}
      error={error}
      disableSubmit={!label || tooLong}
      onClose={onClose}
      onSubmit={() => onSubmit({ ...values, label })}
    >
      {feature ? null : (
        <Field>
          <Label htmlFor="pf-plan">Plan</Label>
          <Select
            id="pf-plan"
            className="h-10"
            value={values.planKey}
            onChange={(e) => setValues((v) => ({ ...v, planKey: e.target.value as PlanKey }))}
          >
            <option value="FREE">Free</option>
            <option value="PAID">Paid</option>
          </Select>
        </Field>
      )}
      <Field>
        <Label htmlFor="pf-label">Feature text</Label>
        <Input
          id="pf-label"
          value={values.label}
          maxLength={PLAN_FEATURE_LABEL_MAX + 20}
          placeholder="First {preliFreeSets} Preli question sets"
          onChange={(e) => setValues((v) => ({ ...v, label: e.target.value }))}
          required
        />
        {tooLong ? (
          <FieldHint className="text-[var(--danger-fg)]">
            Keep it under {PLAN_FEATURE_LABEL_MAX} characters ({label.length} now).
          </FieldHint>
        ) : preview ? (
          <FieldHint>Shows as: {preview}</FieldHint>
        ) : (
          <FieldHint>
            Bangla or English. Live numbers:{' '}
            {PLAN_FEATURE_PLACEHOLDERS.map((p, i) => (
              <span key={p.token}>
                {i ? ', ' : ''}
                <code>{p.token}</code>
              </span>
            ))}
            .
          </FieldHint>
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--accent)]"
            checked={values.isIncluded}
            onChange={(e) => setValues((v) => ({ ...v, isIncluded: e.target.checked }))}
          />
          Included (✓) — untick to show it locked
        </label>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            className="size-4 accent-[var(--accent)]"
            checked={values.isActive}
            onChange={(e) => setValues((v) => ({ ...v, isActive: e.target.checked }))}
          />
          Active (shown on the homepage)
        </label>
      </div>
    </FormDialog>
  );
}
