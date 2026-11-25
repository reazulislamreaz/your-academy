import { PACKAGE_DURATION_MONTHS, type SubscriptionPackageDto } from '@your-academy/shared';

/** DEC-065 — per-package numbers for the homepage plan grid. Pure, so they're easy to check. */
export type PackageCardInfo = {
  pkg: SubscriptionPackageDto;
  /** Charged price ÷ months, whole taka. */
  perMonthBdt: number;
  /** % cheaper per month than the priciest-per-month package (0 when there is nothing to compare). */
  savingsPercent: number;
  /**
   * Admin "Popular" flag; else the cheapest per month (when 2+ packages); a lone package is
   * "recommended" so the paid card is always emphasised.
   */
  highlight: 'popular' | 'best-value' | 'recommended' | null;
};

export function describePackages(packages: SubscriptionPackageDto[]): PackageCardInfo[] {
  const rows = packages.map((pkg) => {
    const months = PACKAGE_DURATION_MONTHS[pkg.duration] || 1;
    return { pkg, perMonth: Number(pkg.effectivePriceBdt) / months };
  });
  const maxPerMonth = Math.max(0, ...rows.map((r) => r.perMonth));
  const anyPopular = packages.some((p) => p.isPopular);
  const cheapest =
    rows.length >= 2
      ? rows.reduce((best, r) => (r.perMonth < best.perMonth ? r : best), rows[0]!)
      : null;

  return rows.map((r) => {
    const savings = maxPerMonth > 0 ? Math.round((1 - r.perMonth / maxPerMonth) * 100) : 0;
    return {
      pkg: r.pkg,
      perMonthBdt: Math.round(r.perMonth),
      savingsPercent: savings >= 1 ? savings : 0,
      highlight: r.pkg.isPopular
        ? 'popular'
        : anyPopular
          ? null
          : rows.length === 1
            ? 'recommended'
            : cheapest && cheapest.pkg.id === r.pkg.id
              ? 'best-value'
              : null,
    };
  });
}
