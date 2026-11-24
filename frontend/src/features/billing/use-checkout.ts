'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { startCheckout } from '@/lib/api/billing';

/** Server-priced SSLCommerz checkout; hands the browser to the gateway on success. */
export function useCheckout() {
  const [buying, setBuying] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (packageId: string) => startCheckout(packageId),
    onMutate: (packageId) => setBuying(packageId),
    // The result comes back on /payment/* after the gateway.
    onSuccess: (res) => window.location.assign(res.gatewayUrl),
    onError: () => setBuying(null),
  });
  return { ...mutation, buying };
}
