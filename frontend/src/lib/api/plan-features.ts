import type { AdminPlanFeatureDto, PlanComparisonDto, PlanKey } from '@your-academy/shared';
import { apiFetch } from './client';

/** DEC-065 — homepage Free vs Paid cards (display only; access is enforced by the API). */
export function getPlanComparison(): Promise<PlanComparisonDto> {
  return apiFetch<PlanComparisonDto>('/public/plan-comparison', { skipRefresh: true });
}

export type PlanFeaturePatch = { label?: string; isIncluded?: boolean; isActive?: boolean };

const json = (body: unknown) => JSON.stringify(body);

export const adminPlanFeaturesApi = {
  list: () => apiFetch<AdminPlanFeatureDto[]>('/admin/plan-features'),
  create: (input: { planKey: PlanKey; label: string; isIncluded: boolean; isActive: boolean }) =>
    apiFetch<AdminPlanFeatureDto>('/admin/plan-features', { method: 'POST', body: json(input) }),
  update: (id: string, patch: PlanFeaturePatch) =>
    apiFetch<AdminPlanFeatureDto>(`/admin/plan-features/${id}`, {
      method: 'PATCH',
      body: json(patch),
    }),
  remove: (id: string) =>
    apiFetch<{ id: string }>(`/admin/plan-features/${id}`, { method: 'DELETE' }),
  reorder: (planKey: PlanKey, ids: string[]) =>
    apiFetch<AdminPlanFeatureDto[]>('/admin/plan-features/reorder', {
      method: 'POST',
      body: json({ planKey, ids }),
    }),
};
