import {
  CONTENT_LOCKED,
  type CheckoutResult,
  type MySubscriptionDto,
  type PaymentOrderPublicStatus,
  type PublicAccessConfig,
  type SubscriptionPackageDto,
} from '@your-academy/shared';
import { ApiError, apiFetch } from './client';

/** DEC-060 — paid-system switch + whether SSLCommerz is configured. */
export function getAccessConfig(): Promise<PublicAccessConfig> {
  return apiFetch<PublicAccessConfig>('/public/access-config', { skipRefresh: true });
}

export function listPackages(): Promise<SubscriptionPackageDto[]> {
  return apiFetch<SubscriptionPackageDto[]>('/public/packages', { skipRefresh: true });
}

/** Server picks price / user; we only say which package. */
export function startCheckout(packageId: string): Promise<CheckoutResult> {
  return apiFetch<CheckoutResult>('/payments/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId }),
  });
}

export function getMySubscription(): Promise<MySubscriptionDto> {
  return apiFetch<MySubscriptionDto>('/me/subscription');
}

// DEC-062 — self-service plan management. Each returns the refreshed billing state.

const post = (path: string, body?: unknown) =>
  apiFetch<MySubscriptionDto>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });

export const cancelRenewal = () => post('/me/subscription/cancel');
export const resumeRenewal = () => post('/me/subscription/resume');
export const scheduleDowngrade = (packageId: string) =>
  post('/me/subscription/scheduled-change', { packageId });
export const clearScheduledChange = () =>
  apiFetch<MySubscriptionDto>('/me/subscription/scheduled-change', { method: 'DELETE' });

/** Result pages: works even when the learner was logged out at the gateway. */
export function getPaymentStatus(tranId: string): Promise<PaymentOrderPublicStatus> {
  return apiFetch<PaymentOrderPublicStatus>(
    `/payments/orders/${encodeURIComponent(tranId)}/status`,
    { skipRefresh: true },
  );
}

/** True when the API refused content because the viewer needs a paid plan (HTTP 403). */
export function isContentLockedError(err: unknown): boolean {
  return err instanceof ApiError && err.code === CONTENT_LOCKED;
}
