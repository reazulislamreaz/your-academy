import type {
  AdminModelTestListItem,
  AdminModelTestUploadResult,
  ModelTestAttemptResult,
  ModelTestCategoryRef,
  ModelTestGuideConfig,
  ModelTestGuideItem,
  ModelTestSubmitResult,
  PublicModelTestDetail,
  PublicModelTestListItem,
} from '@your-academy/shared';
import { apiFetch, apiFetchResult, type ApiResult } from './client';
import { apiUploadForm } from './upload';

export function listPublicModelTests(params?: {
  q?: string;
  year?: number;
  categoryId?: string;
  cursor?: string;
  limit?: number;
}): Promise<ApiResult<PublicModelTestListItem[]>> {
  const sp = new URLSearchParams();
  if (params?.q?.trim()) sp.set('q', params.q.trim());
  if (params?.year != null) sp.set('year', String(params.year));
  if (params?.categoryId) sp.set('categoryId', params.categoryId);
  if (params?.cursor) sp.set('cursor', params.cursor);
  sp.set('limit', String(params?.limit ?? 12));
  return apiFetchResult<PublicModelTestListItem[]>(`/public/model-tests?${sp.toString()}`, {
    skipRefresh: true,
  });
}

export function listPublicModelTestYears(): Promise<number[]> {
  return apiFetch<number[]>('/public/model-tests/meta/years', { skipRefresh: true });
}

export function listPublicModelTestCategories(): Promise<ModelTestCategoryRef[]> {
  return apiFetch<ModelTestCategoryRef[]>('/public/model-tests/meta/categories', {
    skipRefresh: true,
  });
}

export function getPublicModelTestGuide(): Promise<ModelTestGuideConfig> {
  return apiFetch<ModelTestGuideConfig>('/public/model-tests/meta/guide', {
    skipRefresh: true,
  });
}

export function getAdminModelTestGuide(): Promise<ModelTestGuideConfig> {
  return apiFetch<ModelTestGuideConfig>('/admin/model-tests/guide');
}

export function updateAdminModelTestGuide(body: {
  title: string;
  items: ModelTestGuideItem[];
}): Promise<ModelTestGuideConfig> {
  return apiFetch<ModelTestGuideConfig>('/admin/model-tests/guide', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getPublicModelTest(idOrSlug: string): Promise<PublicModelTestDetail> {
  return apiFetch<PublicModelTestDetail>(
    `/public/model-tests/${encodeURIComponent(idOrSlug)}`,
    { skipRefresh: true },
  );
}

export function submitPublicModelTestAttempt(
  idOrSlug: string,
  body: {
    userName?: string;
    userAnswers: Record<string, string>;
    elapsedSeconds?: number;
    timedOut?: boolean;
  },
): Promise<ModelTestSubmitResult> {
  // Include cookies so OptionalJwt can attach authenticated attempts (DEC-045).
  return apiFetch<ModelTestSubmitResult>(
    `/public/model-tests/${encodeURIComponent(idOrSlug)}/attempts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
}

export function getModelTestAttemptResult(attemptId: string): Promise<ModelTestAttemptResult> {
  return apiFetch<ModelTestAttemptResult>(
    `/public/model-tests/attempts/${encodeURIComponent(attemptId)}`,
    { skipRefresh: true },
  );
}

export async function uploadAdminModelTest(input: {
  title: string;
  description?: string;
  durationInMinutes: number;
  examYear?: number;
  categoryId?: string;
  isPublished?: boolean;
  file: File;
}): Promise<AdminModelTestUploadResult> {
  const form = new FormData();
  form.append('title', input.title);
  if (input.description) form.append('description', input.description);
  form.append('durationInMinutes', String(input.durationInMinutes));
  if (input.examYear != null) form.append('examYear', String(input.examYear));
  if (input.categoryId) form.append('categoryId', input.categoryId);
  if (input.isPublished != null) form.append('isPublished', String(input.isPublished));
  form.append('file', input.file);

  const result = await apiUploadForm<AdminModelTestUploadResult>(
    '/admin/model-tests/upload',
    form,
  );
  return result.data;
}

export function listAdminModelTests(params?: { cursor?: string; limit?: number }) {
  const sp = new URLSearchParams();
  sp.set('limit', String(params?.limit ?? 20));
  if (params?.cursor) sp.set('cursor', params.cursor);
  return apiFetchResult<AdminModelTestListItem[]>(
    `/admin/model-tests?${sp.toString()}`,
  );
}

export function listAdminModelTestCategories() {
  return apiFetch<ModelTestCategoryRef[]>('/admin/model-tests/categories');
}

export function createAdminModelTestCategory(name: string) {
  return apiFetch<ModelTestCategoryRef>('/admin/model-tests/categories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export function updateAdminModelTest(
  id: string,
  body: {
    title?: string;
    description?: string | null;
    durationInMinutes?: number;
    examYear?: number | null;
    categoryId?: string | null;
    isPublished?: boolean;
  },
) {
  return apiFetch<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    examYear: number | null;
    durationInMinutes: number;
    isPublished: boolean;
    totalQuestions: number;
    category: ModelTestCategoryRef | null;
  }>(`/admin/model-tests/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function deleteAdminModelTest(id: string) {
  return apiFetch<{ id: string; title: string; deleted: boolean }>(
    `/admin/model-tests/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}
