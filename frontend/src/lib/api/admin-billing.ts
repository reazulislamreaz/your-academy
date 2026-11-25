import type {
  AdminPaymentOrderDto,
  AdminSubscriptionPackageDto,
  AdminUserSubscriptionDetail,
  PackageDuration,
  SiteAccessSettings,
  SubscriptionPackageDto,
} from '@your-academy/shared';
import { apiFetch } from './client';

/** DEC-060 — admin billing API (packages, paid-system settings, subscribers, payments). */

export type PackageInput = {
  name: string;
  duration: PackageDuration;
  priceBdt: string;
  /** DEC-062 — sale price; null removes it. */
  discountedPriceBdt: string | null;
  isPopular: boolean;
  description: string | null;
  features: string[];
  isActive: boolean;
  sortOrder: number;
};

export type AccessSettingsPatch = Partial<
  Pick<SiteAccessSettings, 'paidSystemEnabled' | 'preliFreeSetCount' | 'writtenFreeSetCount'>
>;

export type PaymentActionOutcome = {
  outcome: string;
  order: AdminPaymentOrderDto;
};

export type GatewayLogEntry = {
  id: string;
  kind: string;
  httpStatus: number | null;
  payload: unknown;
  createdAt: string;
};

const json = (body: unknown) => JSON.stringify(body);

export const adminBillingApi = {
  getSettings: () => apiFetch<SiteAccessSettings>('/admin/access-settings'),
  updateSettings: (patch: AccessSettingsPatch) =>
    apiFetch<SiteAccessSettings>('/admin/access-settings', { method: 'PATCH', body: json(patch) }),

  listPackages: () => apiFetch<AdminSubscriptionPackageDto[]>('/admin/packages'),
  createPackage: (input: PackageInput) =>
    apiFetch<SubscriptionPackageDto>('/admin/packages', { method: 'POST', body: json(input) }),
  updatePackage: (id: string, input: Partial<PackageInput>) =>
    apiFetch<SubscriptionPackageDto>(`/admin/packages/${id}`, {
      method: 'PATCH',
      body: json(input),
    }),
  /** 409 PACKAGE_IN_USE when the package has subscribers / payments (deactivate instead). */
  deletePackage: (id: string) =>
    apiFetch<{ id: string; deleted: true }>(`/admin/packages/${id}`, { method: 'DELETE' }),
  /** Every live package id in the new display order. */
  reorderPackages: (ids: string[]) =>
    apiFetch<AdminSubscriptionPackageDto[]>('/admin/packages/reorder', {
      method: 'POST',
      body: json({ ids }),
    }),

  /** DEC-062 — send due 7- / 3-day reminders now (also runs hourly by itself). */
  runReminders: () =>
    apiFetch<{ sent7: number; sent3: number; failed: number }>(
      '/admin/subscriptions/reminders/run',
      { method: 'POST', body: json({}) },
    ),

  getSubscriber: (userId: string) =>
    apiFetch<AdminUserSubscriptionDetail>(`/admin/subscribers/${userId}`),
  grant: (userId: string, body: { packageId?: string; endsAt?: string; note?: string }) =>
    apiFetch<AdminUserSubscriptionDetail>(`/admin/subscribers/${userId}/grant`, {
      method: 'POST',
      body: json(body),
    }),
  extend: (userId: string, body: { days: number; note?: string }) =>
    apiFetch<AdminUserSubscriptionDetail>(`/admin/subscribers/${userId}/extend`, {
      method: 'POST',
      body: json(body),
    }),
  disable: (userId: string, note?: string) =>
    apiFetch<AdminUserSubscriptionDetail>(`/admin/subscribers/${userId}/disable`, {
      method: 'POST',
      body: json(note ? { note } : {}),
    }),
  enable: (userId: string, note?: string) =>
    apiFetch<AdminUserSubscriptionDetail>(`/admin/subscribers/${userId}/enable`, {
      method: 'POST',
      body: json(note ? { note } : {}),
    }),

  recheckPayment: (id: string) =>
    apiFetch<PaymentActionOutcome>(`/admin/payments/${id}/recheck`, { method: 'POST', body: '{}' }),
  approvePayment: (id: string) =>
    apiFetch<PaymentActionOutcome>(`/admin/payments/${id}/approve`, { method: 'POST', body: '{}' }),
  markRefunded: (id: string, note?: string) =>
    apiFetch<AdminPaymentOrderDto>(`/admin/payments/${id}/mark-refunded`, {
      method: 'POST',
      body: json(note ? { note } : {}),
    }),
  paymentLogs: (id: string) => apiFetch<GatewayLogEntry[]>(`/admin/payments/${id}/logs`),
};
