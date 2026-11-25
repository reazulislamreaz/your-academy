/** DEC-065 — which button each homepage plan card shows. Pure, so every case is easy to check. */

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
): PlanCardCta {
  if (viewer.kind === 'guest') {
    return cmsCta.visible
      ? { type: 'link', label: cmsCta.label, href: cmsCta.href }
      : { type: 'none' };
  }
  if (viewer.kind === 'learner' && !viewer.isPaid)
    return { type: 'current', label: 'Current Plan' };
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
): PlanCardCta {
  if (viewer.kind === 'admin') return { type: 'note', label: 'Admins have full access' };
  if (viewer.kind === 'learner' && viewer.isPaid) {
    if (isCurrentPackage === false) return { type: 'link', label: 'Manage plan', href: '/billing' };
    return { type: 'current', label: 'Current Plan' };
  }
  // Paid system OFF: everything is open — no Upgrade button.
  if (!opts.paidSystemEnabled) return { type: 'none' };
  // Never send people to a "payment isn't configured" page.
  if (!opts.paymentsConfigured) return { type: 'contact', label: 'Contact us to upgrade' };
  if (packageId) {
    return viewer.kind === 'guest'
      ? {
          type: 'link',
          label: 'Upgrade',
          href: `/login?callbackUrl=${encodeURIComponent('/packages')}`,
        }
      : { type: 'checkout', label: 'Upgrade', packageId };
  }
  return { type: 'link', label: 'Upgrade', href: '/packages' };
}
