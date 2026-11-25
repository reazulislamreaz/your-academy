/** DEC-065 — which button each homepage plan card shows. Pure, so every case is easy to check. */
import { DEFAULT_PRICING_LABELS, type PricingLabels } from '@your-academy/shared';

/** DEC-069 — button texts come from Admin → Homepage → Access & Pricing. */
type CtaLabels = Pick<
  PricingLabels,
  'upgradeLabel' | 'contactLabel' | 'currentPlanLabel' | 'managePlanLabel' | 'adminNote'
>;

export type PlanCardViewer =
  { kind: 'guest' } | { kind: 'admin' } | { kind: 'learner'; isPaid: boolean };

export type PlanCardCta =
  | { type: 'link'; label: string; href: string }
  | { type: 'contact'; label: string }
  /** Start SSLCommerz checkout for this package (signed-in learners). */
  | { type: 'checkout'; label: string; packageId: string }
  | { type: 'current'; label: string }
  | { type: 'note'; label: string }
  | { type: 'none' };

export function freeCardCta(
  viewer: PlanCardViewer,
  cmsCta: { label: string; href: string; visible: boolean },
  labels: CtaLabels = DEFAULT_PRICING_LABELS,
): PlanCardCta {
  if (viewer.kind === 'guest') {
    return cmsCta.visible
      ? { type: 'link', label: cmsCta.label, href: cmsCta.href }
      : { type: 'none' };
  }
  if (viewer.kind === 'learner' && !viewer.isPaid)
    return { type: 'current', label: labels.currentPlanLabel };
  return { type: 'none' };
}

/**
 * One paid card. `isCurrentPackage`: the paid learner's own package (null = unknown, e.g. an
 * admin grant without a package — then a single generic card shows "Current Plan").
 */
export function paidCardCta(
  viewer: PlanCardViewer,
  opts: { paidSystemEnabled: boolean; paymentsConfigured: boolean },
  isCurrentPackage: boolean | null = null,
  /** When given, "Upgrade" checks out this exact package (logged-out → login, then /packages). */
  packageId?: string,
  labels: CtaLabels = DEFAULT_PRICING_LABELS,
): PlanCardCta {
  if (viewer.kind === 'admin') return { type: 'note', label: labels.adminNote };
  if (viewer.kind === 'learner' && viewer.isPaid) {
    if (isCurrentPackage === false)
      return { type: 'link', label: labels.managePlanLabel, href: '/billing' };
    return { type: 'current', label: labels.currentPlanLabel };
  }
  // Paid system OFF: everything is open — no Upgrade button.
  if (!opts.paidSystemEnabled) return { type: 'none' };
  // Never send people to a "payment isn't configured" page.
  if (!opts.paymentsConfigured) return { type: 'contact', label: labels.contactLabel };
  if (packageId) {
    return viewer.kind === 'guest'
      ? {
          type: 'link',
          label: labels.upgradeLabel,
          href: `/login?callbackUrl=${encodeURIComponent('/packages')}`,
        }
      : { type: 'checkout', label: labels.upgradeLabel, packageId };
  }
  return { type: 'link', label: labels.upgradeLabel, href: '/packages' };
}
