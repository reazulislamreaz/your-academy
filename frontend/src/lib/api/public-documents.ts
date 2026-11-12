import { apiFetch, apiFetchResult } from './client';
import type { DocumentListItem } from './types';

export type PublicDocumentListItem = DocumentListItem & {
  mediaAsset?: {
    originalFilename?: string | null;
    mimeType: string;
    bytes: number;
  } | null;
  createdAt?: string;
};

export type PublicDocumentDetail = PublicDocumentListItem & {
  mediaAsset: {
    id?: string;
    mimeType: string;
    bytes: number;
    originalFilename?: string | null;
    format?: string | null;
  };
  /** In-app view availability — storage URLs are never returned. */
  view: { available: boolean; reason: string };
};

/** Same-origin PDF proxy (Next rewrite → API). Do not use Cloudinary URLs in the UI. */
export function publicDocumentFileUrl(id: string): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
  return `${base}/public/documents/${id}/file`;
}

export async function listPublicDocuments(params: {
  cursor?: string;
  limit?: number;
  q?: string;
}) {
  const qs = new URLSearchParams();
  qs.set('limit', String(params.limit ?? 20));
  if (params.cursor) qs.set('cursor', params.cursor);
  if (params.q) qs.set('q', params.q);
  return apiFetchResult<PublicDocumentListItem[]>(`/public/documents?${qs}`, {
    skipRefresh: true,
  });
}

export async function getPublicDocument(id: string) {
  return apiFetch<PublicDocumentDetail>(`/public/documents/${id}`, {
    skipRefresh: true,
  });
}
