import type { SocialLinkAdmin, SocialLinkPublic, SocialPlatform } from '@your-academy/shared';
import { apiFetch, serverApiBase } from './client';

/**
 * Server Component fetch for the marketing footer (DEC-046).
 * Always `no-store` so admin create/edit/enable changes appear on the next
 * request without waiting for ISR — socials are a tiny payload.
 * Tag retained so on-demand `/api/revalidate/social-links` can still bust any
 * outer Full Route Cache that wrapped a prior render.
 */
export async function getPublicSocialLinks(): Promise<SocialLinkPublic[]> {
  try {
    const res = await fetch(`${serverApiBase()}/public/social-links`, {
      cache: 'no-store',
      next: { tags: ['social-links'] },
    });
    if (!res.ok) {
      console.error(`[social-links] public fetch failed: HTTP ${res.status}`);
      return [];
    }
    const json = (await res.json()) as { success: boolean; data?: SocialLinkPublic[] };
    if (!json.success || !Array.isArray(json.data)) {
      console.error('[social-links] public fetch returned an invalid envelope');
      return [];
    }
    return json.data.filter(
      (link) =>
        Boolean(link?.url?.trim()) &&
        typeof link.platform === 'string' &&
        typeof link.id === 'string',
    );
  } catch (err) {
    console.error('[social-links] public fetch error', err);
    return [];
  }
}

export async function listAdminSocialLinks() {
  return apiFetch<SocialLinkAdmin[]>('/admin/social-links');
}

export async function createAdminSocialLink(input: {
  platform: SocialPlatform;
  url: string;
  label?: string;
  enabled?: boolean;
  sortOrder?: number;
}) {
  return apiFetch<SocialLinkAdmin>('/admin/social-links', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function updateAdminSocialLink(
  id: string,
  input: {
    url?: string;
    label?: string | null;
    enabled?: boolean;
    sortOrder?: number;
  },
) {
  return apiFetch<SocialLinkAdmin>(`/admin/social-links/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteAdminSocialLink(id: string) {
  return apiFetch<{ id: string }>(`/admin/social-links/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export async function reorderAdminSocialLinks(orderedIds: string[]) {
  return apiFetch<SocialLinkAdmin[]>('/admin/social-links/reorder', {
    method: 'PUT',
    body: JSON.stringify({ orderedIds }),
  });
}
