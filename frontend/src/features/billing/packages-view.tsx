'use client';

import { useQuery } from '@tanstack/react-query';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { PACKAGE_DURATION_LABELS, type SubscriptionPackageDto } from '@your-academy/shared';
import { PageHeader } from '@/components/layout/page-header';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Surface } from '@/components/ui/surface';
import { useMe } from '@/features/auth/use-auth';
import { getAccessConfig, listPackages } from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import { formatBdt, formatDate } from './format';
import { useCheckout } from './use-checkout';

/** DEC-060 — public Pricing / Packages page with server-priced SSLCommerz checkout. */
export function PackagesView() {
  const me = useMe();
  const config = useQuery({ queryKey: ['access-config'], queryFn: getAccessConfig });
  const packages = useQuery({ queryKey: ['public-packages'], queryFn: listPackages });
  const checkout = useCheckout();
  const buying = checkout.buying;

  const loggedIn = Boolean(me.data);
  const isAdmin = me.data?.role === 'ADMIN';
  const access = me.data?.access;
  const paidOn = config.data?.paidSystemEnabled ?? true;
  const configured = config.data?.paymentsConfigured ?? true;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pricing"
        title="Packages"
        description="Unlock every Preli and Written question set and every paid Model Test."
      />

      {config.data && !paidOn ? (
        <Alert variant="success">All content is free right now — no purchase needed.</Alert>
      ) : null}
      {paidOn && config.data && !configured ? (
        <Alert variant="warning">
          Online payment is not configured yet. Please contact support to subscribe.
        </Alert>
      ) : null}
      {access?.isPaid && access.subscriptionEndsAt ? (
        <Alert variant="info">
          Your plan is active until <strong>{formatDate(access.subscriptionEndsAt)}</strong>. Buying
          again adds the new duration to this date.
        </Alert>
      ) : null}
      {isAdmin ? <Alert variant="info">Admins already have full access.</Alert> : null}
      {checkout.error ? (
        <Alert variant="danger">
          {checkout.error instanceof ApiError
            ? checkout.error.message
            : 'Could not start the payment. Please try again.'}
        </Alert>
      ) : null}

      {packages.isLoading ? (
        <ListCardSkeleton rows={3} />
      ) : packages.isError ? (
        <LoadError onRetry={() => void packages.refetch()} />
      ) : !packages.data?.length ? (
        <EmptyState
          align="center"
          title="No packages yet"
          description="Packages will appear here as soon as they are published."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.data.map((pkg) => (
            <li key={pkg.id}>
              <PackageCard
                pkg={pkg}
                action={
                  !paidOn || isAdmin ? null : !loggedIn ? (
                    <Link href={`/login?next=${encodeURIComponent('/packages')}`} className="block">
                      <Button className="w-full">Log in to subscribe</Button>
                    </Link>
                  ) : (
                    <Button
                      className="w-full"
                      disabled={!configured || checkout.isPending}
                      loading={buying === pkg.id && checkout.isPending}
                      onClick={() => checkout.mutate(pkg.id)}
                    >
                      {access?.isPaid ? 'Extend with this plan' : 'Buy / Subscribe'}
                    </Button>
                  )
                }
              />
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-[var(--muted)]">
        Payments are processed securely by SSLCommerz (cards, bKash, Nagad, Rocket and more). Your
        plan starts as soon as the payment is confirmed.
      </p>
    </div>
  );
}

export function PackageCard({
  pkg,
  action,
}: {
  pkg: SubscriptionPackageDto;
  action: React.ReactNode;
}) {
  return (
    <Surface
      className={`flex h-full flex-col gap-4 p-5 sm:p-6 ${pkg.isPopular ? 'ring-2 ring-[var(--highlight)]' : ''}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-[0.12em] text-[var(--highlight)] uppercase">
            {PACKAGE_DURATION_LABELS[pkg.duration]}
          </p>
          {pkg.isPopular ? <Badge variant="highlight">Popular</Badge> : null}
        </div>
        <h2 className="font-display mt-1 text-xl font-bold tracking-tight text-[var(--ink)]">
          {pkg.name}
        </h2>
        <p className="mt-2 flex flex-wrap items-baseline gap-x-2">
          <span className="font-display text-3xl font-bold text-[var(--ink)] tabular-nums">
            {formatBdt(pkg.effectivePriceBdt)}
          </span>
          {pkg.discountedPriceBdt ? (
            <span className="text-base text-[var(--muted)] tabular-nums line-through">
              <span className="sr-only">Regular price </span>
              {formatBdt(pkg.priceBdt)}
            </span>
          ) : null}
        </p>
      </div>
      {pkg.description ? (
        <p className="text-sm leading-relaxed whitespace-pre-wrap text-[var(--ink-soft)]">
          {pkg.description}
        </p>
      ) : null}
      {pkg.features.length ? (
        <ul className="space-y-2 text-sm text-[var(--ink-soft)]">
          {pkg.features.map((f) => (
            <li key={f} className="flex gap-2">
              <Check className="mt-0.5 size-4 shrink-0 text-[var(--success)]" aria-hidden />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-auto pt-2">{action}</div>
    </Surface>
  );
}
