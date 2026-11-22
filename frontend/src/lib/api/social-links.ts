import type { SocialLinkAdmin, SocialLinkPublic, SocialPlatform } from '@your-academy/shared';
import { apiFetch, serverApiBase } from './client';

/** Server Component / layout fetch — tagged for on-demand purge after admin edits. */
export async function getPublicSocialLinks(): Promise<SocialLinkPublic[]> {
  try {
    const res = await fetch(`${serverApiBase()}/public/social-links`, {
      next: { revalidate: 30, tags: ['social-links'] },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { success: boolean; data?: SocialLinkPublic[] };
    if (!json.success || !Array.isArray(json.data)) return [];
    return json.data;
  } catch {
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
