'use client';

import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, CircleCheck, Lock, MessageCircle, Sparkles } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
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
import { openSupportChat } from '@/features/support/support-events';
import { getPlanComparison } from '@/lib/api/plan-features';
import { cn } from '@/lib/utils';

type Props = {
  content: HomepagePayload['accessFaq'];
  /** Today's left column (highlights + CTA) — shown when the comparison can't be loaded. */
  legacyIntro: ReactNode;
  faq: ReactNode;
};

/**
 * DEC-065 — "Access & Pricing": Free | Paid cards from Admin → Pricing & Plan Features.
 * Display only; the API enforces access. Never breaks the homepage: on error or an empty list
 * it renders the previous two-column layout unchanged.
 */
export function HomepagePlanComparison({ content, legacyIntro, faq }: Props) {
  const comparison = useQuery({
    queryKey: ['plan-comparison'],
    queryFn: getPlanComparison,
    staleTime: 30_000,
    retry: 1,
  });
  const me = useMe();

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

  const viewer: PlanCardViewer = me.data
    ? me.data.role === 'ADMIN'
      ? { kind: 'admin' }
      : { kind: 'learner', isPaid: Boolean(me.data.access?.isPaid) }
    : { kind: 'guest' };

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
          Everything is free right now.
        </p>
      ) : null}

      {!data ? (
        <div
          className="grid gap-4 md:grid-cols-2 md:gap-6"
          aria-busy="true"
          aria-label="Loading plans"
        >
          {[0, 1].map((i) => (
            <div key={i} className="hp-card h-80 animate-pulse" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 md:gap-6">
          <li className="min-w-0">
            <PlanCard
              title="Free"
              price="৳0"
              priceNote="No payment needed"
              description="Start practicing with an account — no card, no commitment."
              features={data.free.features}
              cta={freeCardCta(viewer, content.cta)}
            />
          </li>
          <li className="min-w-0">
            <PlanCard
              highlighted
              title="Paid"
              price={
                data.paid.cheapest ? formatBdt(data.paid.cheapest.effectivePriceBdt) : undefined
              }
              priceNote={
                data.paid.cheapest
                  ? `/ ${PACKAGE_DURATION_LABELS[data.paid.cheapest.duration].toLowerCase()}`
                  : undefined
              }
              strikePrice={
                data.paid.cheapest &&
                data.paid.cheapest.priceBdt !== data.paid.cheapest.effectivePriceBdt
                  ? formatBdt(data.paid.cheapest.priceBdt)
                  : undefined
              }
              description="Unlock every question set, Model Test and premium PDF."
              features={data.paid.features}
              cta={paidCardCta(viewer, data)}
              footer={
                data.paid.packageCount > 0 ? (
                  <Link
                    href="/packages"
                    className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
                  >
                    See all plans
                    <ArrowRight className="size-3.5" aria-hidden />
                  </Link>
                ) : null
              }
            />
          </li>
        </ul>
      )}

      <div className="max-w-3xl">{faq}</div>
    </HomepageReveal>
  );
}

function PlanCard({
  title,
  price,
  priceNote,
  strikePrice,
  description,
  features,
  cta,
  footer,
  highlighted = false,
}: {
  title: string;
  price?: string;
  priceNote?: string;
  strikePrice?: string;
  description: string;
  features: PlanFeatureDto[];
  cta: PlanCardCta;
  footer?: ReactNode;
  highlighted?: boolean;
}) {
  const headingId = `plan-${title.toLowerCase()}-heading`;
  return (
    <article
      aria-labelledby={headingId}
      className={cn(
        'hp-card flex h-full flex-col gap-5 p-5 sm:p-6',
        highlighted && 'border-2 !border-[var(--highlight)] shadow-[var(--hp-shadow-hover)]',
      )}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h3 id={headingId} className="font-display text-lg font-bold text-[var(--ink)]">
            {title}
          </h3>
          {highlighted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--highlight)] px-2.5 py-1 text-xs font-bold text-[var(--highlight-fg)]">
              <Sparkles className="size-3.5" aria-hidden />
              Recommended
            </span>
          ) : null}
        </div>
        {price ? (
          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="font-display text-3xl font-bold text-[var(--ink)] tabular-nums">
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
        <p className="text-sm leading-relaxed text-[var(--ink-soft)]">{description}</p>
      </div>

      {features.length ? (
        <ul className="space-y-2.5 text-sm">
          {features.map((f) => (
            <li key={f.id} className="flex items-start gap-2.5">
              {f.isIncluded ? (
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--success)]" aria-hidden />
              ) : (
                <Lock className="mt-0.5 size-4 shrink-0 text-[var(--muted)]" aria-hidden />
              )}
              <span className={f.isIncluded ? 'text-[var(--ink)]' : 'text-[var(--muted-strong)]'}>
                <span className="sr-only">{f.isIncluded ? 'Included: ' : 'Not included: '}</span>
                {f.label}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-auto space-y-2 pt-1">
        <PlanCtaButton cta={cta} highlighted={highlighted} />
        {footer}
      </div>
    </article>
  );
}

function PlanCtaButton({ cta, highlighted }: { cta: PlanCardCta; highlighted: boolean }) {
  const className = 'min-h-11 w-full rounded-full font-semibold';
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
        <p className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--success)]/40 bg-[var(--success-soft)] text-sm font-semibold text-[var(--success-fg)]">
          <CircleCheck className="size-4" aria-hidden />
          {cta.label}
        </p>
      );
    case 'note':
      return (
        <p className="flex min-h-11 items-center justify-center text-sm font-semibold text-[var(--muted-strong)]">
          {cta.label}
        </p>
      );
    default:
      return null;
  }
}
