/**
 * DEC-065 — homepage "Access & Pricing" Free vs Paid comparison. Display only: what a learner
 * can open is decided by the API's AccessPolicyService, never by these labels.
 */
import type { PackageDuration } from './billing';

/** DEC-061 / DEC-063 — Topic-Based trial length (DB default `users.trial_ends_at = now() + 7 days`). */
export const TOPIC_TRIAL_DAYS = 7;

export type PlanKey = 'FREE' | 'PAID';
export const PLAN_KEYS: readonly PlanKey[] = ['FREE', 'PAID'];

export const PLAN_FEATURE_LABEL_MAX = 200;

/** Live values a label may reference, e.g. "First {preliFreeSets} Preli question sets". */
export type PlanFeaturePlaceholderValues = {
  preliFreeSets: number;
  writtenFreeSets: number;
  topicTrialDays: number;
};

export const PLAN_FEATURE_PLACEHOLDERS: ReadonlyArray<{
  token: `{${keyof PlanFeaturePlaceholderValues}}`;
  description: string;
}> = [
  { token: '{preliFreeSets}', description: 'Free Preli sets (Admin → Paid system)' },
  { token: '{writtenFreeSets}', description: 'Free Written sets (Admin → Paid system)' },
  { token: '{topicTrialDays}', description: 'Topic-Based free days after sign-up' },
];

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const HAS_BENGALI = /[ঀ-৿]/;

/** Fills {placeholders}; numbers use Bangla digits when the label is written in Bangla. */
export function resolvePlanFeatureLabel(
  label: string,
  values: PlanFeaturePlaceholderValues,
): string {
  const bangla = HAS_BENGALI.test(label);
  return label.replace(/\{(preliFreeSets|writtenFreeSets|topicTrialDays)\}/g, (_, key: string) => {
    const n = String(values[key as keyof PlanFeaturePlaceholderValues]);
    return bangla ? n.replace(/\d/g, (d) => BN_DIGITS[Number(d)]!) : n;
  });
}

/** Public row — label already resolved. */
export type PlanFeatureDto = { id: string; label: string; isIncluded: boolean };

/** Admin row — raw label (with placeholders). */
export type AdminPlanFeatureDto = {
  id: string;
  planKey: PlanKey;
  label: string;
  isIncluded: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** `GET /public/plan-comparison` — everything the homepage cards need. */
export type PlanComparisonDto = {
  paidSystemEnabled: boolean;
  /** False while SSLCommerz credentials are unset → "Contact us to upgrade" instead of checkout. */
  paymentsConfigured: boolean;
  free: { features: PlanFeatureDto[] };
  paid: {
    features: PlanFeatureDto[];
    /** Cheapest active package by what checkout charges; null when none is on sale. */
    cheapest: {
      name: string;
      duration: PackageDuration;
      priceBdt: string;
      effectivePriceBdt: string;
    } | null;
    packageCount: number;
  };
};
