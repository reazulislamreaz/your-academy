'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, CircleCheck, Lock, MessageCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  DEFAULT_PRICING_LABELS,
  PACKAGE_DURATION_LABELS,
  type HomepagePayload,
  type PlanFeatureDto,
} from '@your-academy/shared';
import { HomepageReveal } from '@/components/marketing/homepage-gsap';
import { Button } from '@/components/ui/button';
import { useMe } from '@/features/auth/use-auth';
import { formatBdt } from '@/features/billing/format';
import {
  freeCardCta,
  paidCardCta,
  type PlanCardCta,
  type PlanCardViewer,
} from '@/features/billing/plan-card-cta';
import { describePackages, mergePaidFeatures } from '@/features/billing/plan-pricing';
import { useCheckout } from '@/features/billing/use-checkout';
import { openSupportChat } from '@/features/support/support-events';
import { getMySubscription } from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import { getPlanComparison } from '@/lib/api/plan-features';
import { cn } from '@/lib/utils';

type Props = {
  content: HomepagePayload['accessFaq'];
  /** Today's left column (highlights + CTA) — shown when the comparison can't be loaded. */
  legacyIntro: ReactNode;
  faq: ReactNode;
};

/** Columns follow the number of cards (Free + active packages), up to four across. */
function gridClass(count: number): string {
  if (count >= 4) return 'sm:grid-cols-2 lg:grid-cols-4';
  if (count === 3) return 'sm:grid-cols-2 lg:grid-cols-3';
  return 'sm:grid-cols-2';
}

/**
 * DEC-065 — "Access & Pricing": a Free card plus one card per active package (Admin →
 * Packages), features from Admin → Pricing & Plan Features. Display only; the API enforces
 * access. On error or an empty feature list it renders the previous two-column layout.
 */
export function HomepagePlanComparison({ content, legacyIntro, faq }: Props) {
  const comparison = useQuery({
    queryKey: ['plan-comparison'],
    queryFn: getPlanComparison,
    staleTime: 30_000,
    retry: 1,
  });
  const me = useMe();
  const viewer: PlanCardViewer = me.data
    ? me.data.role === 'ADMIN'
      ? { kind: 'admin' }
      : { kind: 'learner', isPaid: Boolean(me.data.access?.isPaid) }
    : { kind: 'guest' };
  // Only paid learners: which package card is "Current Plan".
  const mine = useQuery({
    queryKey: ['my-subscription'],
    queryFn: getMySubscription,
    enabled: viewer.kind === 'learner' && viewer.isPaid,
    staleTime: 60_000,
  });

  const data = comparison.data;
  const empty = data && data.free.features.length === 0 && data.paid.features.length === 0;
  if (comparison.isError || empty) {
    return (
      <HomepageReveal className="marketing-container grid min-w-0 gap-8 sm:gap-10 lg:grid-cols-2 lg:gap-16">
        {legacyIntro}
        {faq}
      </HomepageReveal>
    );
  }

  const packages = data ? describePackages(data.paid.packages) : [];
  // DEC-069 — card labels from Admin → Homepage → Access & Pricing (defaults = previous text).
  const L = { ...DEFAULT_PRICING_LABELS, ...(content.pricing ?? {}) };
  const myPackageId = mine.data?.billing.packageId ?? null;
  const knowsMyPackage = Boolean(myPackageId && packages.some((p) => p.pkg.id === myPackageId));
  const cardCount = 1 + packages.length;

  return (
    <HomepageReveal className="marketing-container min-w-0 space-y-8 sm:space-y-10">
      <div className="max-w-2xl space-y-4 sm:space-y-5">
        <span className="hp-mark" aria-hidden />
        <p className="hp-eyebrow">{content.eyebrow?.trim() || 'Access'}</p>
        <h2 id="access-heading" className="hp-heading text-[1.35rem] sm:text-2xl md:text-[1.85rem]">
          {content.heading}
        </h2>
        <p className="hp-lede text-sm sm:text-[0.975rem]">{content.body}</p>
      </div>

      {data && !data.paidSystemEnabled ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-[var(--hp-radius)] border border-[var(--success)]/30 bg-[var(--success-soft)] px-4 py-3 text-sm font-semibold text-[var(--success-fg)]"
        >
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          {L.paidOffNotice}
        </p>
      ) : null}

      {!data ? (
        <div
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5"
          aria-busy="true"
          aria-label="Loading plans"
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn('hp-card h-72 animate-pulse', i > 1 && 'hidden lg:block')} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <ul className={cn('grid grid-cols-1 gap-4 lg:gap-5', gridClass(cardCount))}>
            <li className="min-w-0">
              <PlanCard
                id="free"
                title={L.freeTitle}
                price={L.freePrice}
                priceNote={L.freePriceNote}
                description={L.freeDescription}
                features={data.free.features}
                cta={freeCardCta(viewer, content.cta, L)}
              />
            </li>
            {packages.map(({ pkg, perMonthBdt, savingsPercent, highlight }) => (
              <li key={pkg.id} className="min-w-0">
                <PlanCard
                  id={pkg.id}
                  title={pkg.name}
                  badge={highlight === 'recommended' ? L.recommendedBadge : undefined}
                  highlighted={highlight !== null}
                  price={formatBdt(pkg.effectivePriceBdt)}
                  priceNote={`/ ${PACKAGE_DURATION_LABELS[pkg.duration].toLowerCase()}`}
                  strikePrice={pkg.discountedPriceBdt ? formatBdt(pkg.priceBdt) : undefined}
                  subPrice={
                    pkg.duration === 'MONTHLY'
                      ? undefined
                      : `≈ ${formatBdt(String(perMonthBdt))}${L.perMonthSuffix}${savingsPercent ? ` · ${L.saveLabel.replace('{percent}', String(savingsPercent))}` : ''}`
                  }
                  description={pkg.description?.trim() || L.paidDescriptionFallback}
                  features={mergePaidFeatures(data.paid.features, pkg)}
                  cta={paidCardCta(
                    viewer,
                    data,
                    // Known package → mark that card. Unknown (e.g. admin grant) → only a lone
                    // paid card may say "Current Plan"; with several, none does.
                    knowsMyPackage ? pkg.id === myPackageId : packages.length === 1 ? null : false,
                    pkg.id,
                    L,
                  )}
                />
              </li>
            ))}
            {/* No active package → only the Free card. */}
          </ul>
          {packages.length ? (
            <p className="text-xs text-[var(--muted-strong)]">
              {L.footnote}{' '}
              <Link
                href="/packages"
                className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              >
                {L.detailsLinkLabel}
              </Link>
            </p>
          ) : null}
        </div>
      )}

      {/* FAQ spans the same container width as the plan grid above. */}
      <div className="border-t border-[var(--hp-panel-border)] pt-8 sm:pt-10">{faq}</div>
    </HomepageReveal>
  );
}

function PlanCard({
  id,
  title,
  badge,
  price,
  priceNote,
  strikePrice,
  subPrice,
  description,
  features,
  cta,
  highlighted = false,
}: {
  id: string;
  title: string;
  badge?: string;
  price?: string;
  priceNote?: string;
  strikePrice?: string;
  subPrice?: string;
  description: string;
  features: PlanFeatureDto[];
  cta: PlanCardCta;
  highlighted?: boolean;
}) {
  const headingId = `plan-${id}-heading`;
  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        'hp-card relative flex h-full flex-col gap-4 p-4 sm:p-5',
        highlighted &&
          '!border-[var(--highlight)] shadow-[var(--hp-shadow-hover)] ring-1 ring-[var(--highlight)]',
      )}
    >
      <div className="space-y-1.5">
        <div className="flex min-h-6 items-center justify-between gap-2">
          <h3 id={headingId} className="font-display text-base font-bold text-[var(--ink)]">
            {title}
          </h3>
          {badge ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--highlight)] px-2 py-0.5 text-[0.6875rem] font-bold text-[var(--highlight-fg)]">
              <Sparkles className="size-3" aria-hidden />
              {badge}
            </span>
          ) : null}
        </div>
        {price ? (
          <p className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="font-display text-2xl font-bold text-[var(--ink)] tabular-nums">
              {price}
            </span>
            {strikePrice ? (
              <span className="text-sm text-[var(--muted)] tabular-nums line-through">
                <span className="sr-only">Regular price </span>
                {strikePrice}
              </span>
            ) : null}
            {priceNote ? (
              <span className="text-sm text-[var(--muted-strong)]">{priceNote}</span>
            ) : null}
          </p>
        ) : null}
        {subPrice ? (
          <p className="text-xs font-semibold text-[var(--success-fg)] tabular-nums">{subPrice}</p>
        ) : null}
        <p className="text-sm leading-snug text-[var(--ink-soft)]">{description}</p>
      </div>

      {features.length ? (
        <ul className="space-y-1.5 text-[0.8125rem] leading-snug">
          {features.map((f) => (
            <li key={f.id} className="flex items-start gap-2">
              {f.isIncluded ? (
                <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--success)]" aria-hidden />
              ) : (
                <Lock className="mt-0.5 size-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
              )}
              <span className={f.isIncluded ? 'text-[var(--ink)]' : 'text-[var(--muted-strong)]'}>
                <span className="sr-only">{f.isIncluded ? 'Included: ' : 'Not included: '}</span>
                {f.label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto pt-1">
        <PlanCtaButton cta={cta} highlighted={highlighted} />
      </div>
    </article>
  );
}

function PlanCtaButton({ cta, highlighted }: { cta: PlanCardCta; highlighted: boolean }) {
  const checkout = useCheckout();
  const className = 'min-h-10 w-full rounded-full text-sm font-semibold';
  switch (cta.type) {
    case 'link':
      return (
        <Link href={cta.href} className="block">
          <Button className={className} variant={highlighted ? 'primary' : 'outline'}>
            {cta.label}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        </Link>
      );
    case 'checkout':
      return (
        <div className="space-y-1.5">
          <Button
            type="button"
            className={className}
            variant={highlighted ? 'primary' : 'outline'}
            loading={checkout.isPending}
            disabled={checkout.isPending}
            onClick={() => checkout.mutate(cta.packageId)}
          >
            {cta.label}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
          {checkout.error ? (
            <p role="alert" className="text-center text-xs text-[var(--danger-fg)]">
              {checkout.error instanceof ApiError
                ? checkout.error.message
                : 'Could not start the payment. Please try again.'}
            </p>
          ) : null}
        </div>
      );
    case 'contact':
      return (
        <Button
          type="button"
          className={className}
          variant={highlighted ? 'primary' : 'outline'}
          onClick={openSupportChat}
        >
          <MessageCircle className="size-4" aria-hidden />
          {cta.label}
        </Button>
      );
    case 'current':
      return (
        <p className="flex min-h-10 items-center justify-center gap-2 rounded-full border border-[var(--success)]/40 bg-[var(--success-soft)] text-sm font-semibold text-[var(--success-fg)]">
          <CircleCheck className="size-4" aria-hidden />
          {cta.label}
        </p>
      );
    case 'note':
      return (
        <p className="flex min-h-10 items-center justify-center text-center text-sm font-semibold text-[var(--muted-strong)]">
          {cta.label}
        </p>
      );
    default:
      return null;
  }
}
