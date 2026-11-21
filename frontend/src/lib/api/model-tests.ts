import type {
  AdminModelTestListItem,
  AdminModelTestUploadResult,
  ModelTestAttemptResult,
  ModelTestSubmitResult,
  PublicModelTestDetail,
  PublicModelTestListItem,
} from '@your-academy/shared';
import { apiFetch } from './client';
import { apiUploadForm } from './upload';

export function listPublicModelTests(params?: {
  q?: string;
  year?: number;
}): Promise<PublicModelTestListItem[]> {
  const sp = new URLSearchParams();
  if (params?.q?.trim()) sp.set('q', params.q.trim());
  if (params?.year != null) sp.set('year', String(params.year));
  const qs = sp.toString();
  return apiFetch<PublicModelTestListItem[]>(
    `/public/model-tests${qs ? `?${qs}` : ''}`,
    { skipRefresh: true },
  );
}

export function listPublicModelTestYears(): Promise<number[]> {
  return apiFetch<number[]>('/public/model-tests/meta/years', { skipRefresh: true });
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
    userName: string;
    userAnswers: Record<string, string>;
    elapsedSeconds?: number;
    timedOut?: boolean;
  },
): Promise<ModelTestSubmitResult> {
  return apiFetch<ModelTestSubmitResult>(
    `/public/model-tests/${encodeURIComponent(idOrSlug)}/attempts`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      skipRefresh: true,
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
  isPublished?: boolean;
  file: File;
}): Promise<AdminModelTestUploadResult> {
  const form = new FormData();
  form.append('title', input.title);
  if (input.description) form.append('description', input.description);
  form.append('durationInMinutes', String(input.durationInMinutes));
  if (input.examYear != null) form.append('examYear', String(input.examYear));
  if (input.isPublished != null) form.append('isPublished', String(input.isPublished));
  form.append('file', input.file);

  const result = await apiUploadForm<AdminModelTestUploadResult>(
    '/admin/model-tests/upload',
    form,
  );
  return result.data;
}

export function listAdminModelTests() {
  return apiFetch<AdminModelTestListItem[]>('/admin/model-tests');
}

export function updateAdminModelTest(
  id: string,
  body: {
    title?: string;
    description?: string | null;
    durationInMinutes?: number;
    examYear?: number | null;
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
