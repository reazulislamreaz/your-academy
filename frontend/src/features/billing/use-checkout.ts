'use client';

import { useIsMutating, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { startCheckout } from '@/lib/api/billing';

const CHECKOUT_MUTATION_KEY = ['checkout'] as const;

/**
 * ERR-14 — true while ANY checkout on the page is starting (each plan card has its own hook),
 * so a second plan can't be started in parallel.
 */
export function useAnyCheckoutPending(): boolean {
  return useIsMutating({ mutationKey: CHECKOUT_MUTATION_KEY }) > 0;
}

/** Server-priced SSLCommerz checkout; hands the browser to the gateway on success. */
export function useCheckout() {
  const [buying, setBuying] = useState<string | null>(null);
  const mutation = useMutation({
    mutationKey: CHECKOUT_MUTATION_KEY,
    mutationFn: (packageId: string) => startCheckout(packageId),
    onMutate: (packageId) => setBuying(packageId),
    // The result comes back on /payment/* after the gateway.
    onSuccess: (res) => window.location.assign(res.gatewayUrl),
    onError: () => setBuying(null),
  });
  return { ...mutation, buying };
}
