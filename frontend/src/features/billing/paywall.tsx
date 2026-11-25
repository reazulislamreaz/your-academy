'use client';

import { useQuery } from '@tanstack/react-query';
import { Lock } from 'lucide-react';
import { ListCardSkeleton, LoadError } from '@/components/loading';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { useMe } from '@/features/auth/use-auth';
import { getAccessConfig, listPackages } from '@/lib/api/billing';
import { ApiError } from '@/lib/api/client';
import { formatDate } from './format';
import { PackageCard } from './packages-view';
import { useCheckout } from './use-checkout';

/**
 * DEC-061 — shown instead of locked content to signed-in users whose trial has ended and
 * who have no active subscription. The API refuses the content itself; this is the offer.
 */
export function Paywall({ title }: { title?: string }) {
  const me = useMe();
  const packages = useQuery({ queryKey: ['public-packages'], queryFn: listPackages });
  const config = useQuery({ queryKey: ['access-config'], queryFn: getAccessConfig });
  const checkout = useCheckout();
  const trialEndsAt = me.data?.access.trialEndsAt ?? null;
  const configured = config.data?.paymentsConfigured ?? true;

  return (
    <section aria-labelledby="paywall-heading" className="space-y-5">
      <Surface className="space-y-2 p-5 text-center sm:p-6">
        <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--ink)]">
          <Lock className="size-6" aria-hidden />
        </span>
        {title ? (
          <p className="text-sm font-semibold break-words text-[var(--muted-strong)]">{title}</p>
        ) : null}
        <h2
          id="paywall-heading"
          className="font-display text-xl font-bold tracking-tight text-[var(--ink)]"
        >
          {trialEndsAt ? 'Your 7-day Topic-Based free access has ended' : 'Subscribe to unlock'}
        </h2>
        <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
          {trialEndsAt
            ? `Your free Topic-Based access ended on ${formatDate(trialEndsAt)}. Choose a plan to keep studying every topic.`
            : 'Choose a plan to unlock every topic category.'}
        </p>
      </Surface>

      {!configured ? (
        <Alert variant="warning">
          Online payment is not configured yet. Please contact support to subscribe.
        </Alert>
      ) : null}
      {checkout.error ? (
        <Alert variant="danger">
          {checkout.error instanceof ApiError
            ? checkout.error.message
            : 'Could not start the payment. Please try again.'}
        </Alert>
      ) : null}

      {packages.isLoading ? (
        <ListCardSkeleton rows={2} />
      ) : packages.isError ? (
        <LoadError onRetry={() => void packages.refetch()} />
      ) : !packages.data?.length ? (
        <Alert variant="info">Plans will be available soon. Please check back later.</Alert>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {packages.data.map((pkg) => (
            <li key={pkg.id}>
              <PackageCard
                pkg={pkg}
                action={
                  <Button
                    className="w-full"
                    disabled={!configured || checkout.isPending}
                    loading={checkout.buying === pkg.id && checkout.isPending}
                    onClick={() => checkout.mutate(pkg.id)}
                  >
                    Subscribe Now
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
