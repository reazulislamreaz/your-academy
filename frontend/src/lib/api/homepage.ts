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

/**
 * Server Component / RSC fetch — uses internal API origin.
 * Tagged so admin publish can purge via `revalidateTag('homepage')`.
 * Keep a modest ISR window as a fallback when on-demand revalidation is skipped.
 */
export async function getPublicHomepage() {
  const res = await fetch(`${serverApiBase()}/public/homepage`, {
    // Tagged for on-demand purge after admin Publish (`revalidateTag('homepage')`).
    next: { revalidate: 15, tags: ['homepage'] },
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

export type HomepageRevisionSummary = {
  id: string;
  note: string | null;
  createdAt: string;
  createdById: string | null;
  heroImageAssetId: string | null;
};

export async function listHomepageRevisions(limit = 20) {
  return apiFetch<HomepageRevisionSummary[]>(
    `/admin/homepage/revisions?limit=${encodeURIComponent(String(limit))}`,
  );
}

export async function restoreHomepageRevision(id: string) {
  return apiFetch<HomepageAdminBundle['draft']>(
    `/admin/homepage/revisions/${encodeURIComponent(id)}/restore`,
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  );
}
