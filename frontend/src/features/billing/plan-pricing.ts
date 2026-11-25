import {
  PACKAGE_DURATION_MONTHS,
  type PlanFeatureDto,
  type SubscriptionPackageDto,
} from '@your-academy/shared';

/** DEC-065 / Plan 1 — per-package numbers for the homepage plan grid. Pure, so easy to check. */
export type PackageCardInfo = {
  pkg: SubscriptionPackageDto;
  /** Charged price ÷ months, whole taka. */
  perMonthBdt: number;
  /**
   * % cheaper per month than the 3 Months package (or, without one, the priciest per month).
   * 0 when there is no saving.
   */
  savingsPercent: number;
  /** Only the package the admin marked Recommended (Admin → Packages). */
  highlight: 'recommended' | null;
};

export function describePackages(packages: SubscriptionPackageDto[]): PackageCardInfo[] {
  const rows = packages.map((pkg) => {
    const months = PACKAGE_DURATION_MONTHS[pkg.duration] || 1;
    return { pkg, perMonth: Number(pkg.effectivePriceBdt) / months };
  });
  const threeMonths = rows.find((r) => r.pkg.duration === 'THREE_MONTHS');
  const baseline = threeMonths ? threeMonths.perMonth : Math.max(0, ...rows.map((r) => r.perMonth));

  return rows.map((r) => {
    const savings = baseline > 0 ? Math.round((1 - r.perMonth / baseline) * 100) : 0;
    return {
      pkg: r.pkg,
      perMonthBdt: Math.round(r.perMonth),
      savingsPercent: savings >= 1 ? savings : 0,
      highlight: r.pkg.isPopular ? 'recommended' : null,
    };
  });
}

/**
 * Paid card list: the shared Paid features (Admin → Pricing & Plan Features — every paid plan
 * unlocks the same content) followed by the package's own extras, without duplicates.
 */
export function mergePaidFeatures(
  shared: PlanFeatureDto[],
  pkg: SubscriptionPackageDto,
): PlanFeatureDto[] {
  const norm = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ').toLowerCase();
  const seen = new Set(shared.map((f) => norm(f.label)));
  const extras: PlanFeatureDto[] = [];
  pkg.features.forEach((label, i) => {
    const key = norm(label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    extras.push({ id: `${pkg.id}-${i}`, label, isIncluded: true });
  });
  return [...shared, ...extras];
}
