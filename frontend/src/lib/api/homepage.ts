import type { HomepagePayload } from '@your-academy/shared';
import { apiFetch, serverApiBase } from './client';

export type HomepageView = {
  payload: HomepagePayload;
  heroImageUrl: string | null;
  publishedAt: string | null;
  updatedAt: string;
};

export type HomepageAdminBundle = {
  draft: HomepageView & { id: string; heroImageAssetId: string | null };
  published: HomepageView & { id: string; heroImageAssetId: string | null };
};

/** Server Component / RSC fetch — uses internal API origin. */
export async function getPublicHomepage() {
  const res = await fetch(`${serverApiBase()}/public/homepage`, {
    next: { revalidate: 60, tags: ['homepage'] },
  });
  if (!res.ok) {
    throw new Error(`Homepage fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as { success: boolean; data?: HomepageView };
  if (!json.success || !json.data) {
    throw new Error('Homepage envelope invalid');
  }
  return json.data;
}

export async function getAdminHomepage() {
  return apiFetch<HomepageAdminBundle>('/admin/homepage');
}

export async function saveHomepageDraft(input: {
  payload: HomepagePayload;
  heroImageAssetId?: string | null;
}) {
  return apiFetch<HomepageAdminBundle['draft']>('/admin/homepage/draft', {
    method: 'PUT',
    body: JSON.stringify(input),
  });
}

export async function publishHomepage() {
  return apiFetch<HomepageAdminBundle['published']>('/admin/homepage/publish', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export async function restoreHomepage() {
  return apiFetch<HomepageAdminBundle['draft']>('/admin/homepage/restore', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}
