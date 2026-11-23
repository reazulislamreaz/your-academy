import type {
  AdminExamDetail,
  AdminExamQuestion,
  AdminExamUploadResult,
  ExamAttemptResult,
  ExamGuideConfig,
  ExamGuideItem,
  ExamSubmitResult,
  PublicExamDetail,
  PublicExamListItem,
} from '@your-academy/shared';
import { apiFetch, apiFetchResult, type ApiResult } from './client';
import { apiUploadForm } from './upload';

export function listPublicExams(params?: {
  q?: string;
  cursor?: string;
  limit?: number;
}): Promise<ApiResult<PublicExamListItem[]>> {
  const sp = new URLSearchParams();
  if (params?.q?.trim()) sp.set('q', params.q.trim());
  if (params?.cursor) sp.set('cursor', params.cursor);
  sp.set('limit', String(params?.limit ?? 12));
  return apiFetchResult<PublicExamListItem[]>(`/public/exams?${sp.toString()}`, {
    skipRefresh: true,
  });
}

export function getPublicExamGuide(): Promise<ExamGuideConfig> {
  return apiFetch<ExamGuideConfig>('/public/exams/meta/guide', {
    skipRefresh: true,
  });
}

export function getAdminExamGuide(): Promise<ExamGuideConfig> {
  return apiFetch<ExamGuideConfig>('/admin/exams/guide');
}

export function updateAdminExamGuide(body: {
  title: string;
  items: ExamGuideItem[];
}): Promise<ExamGuideConfig> {
  return apiFetch<ExamGuideConfig>('/admin/exams/guide', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getPublicExam(idOrSlug: string): Promise<PublicExamDetail> {
  return apiFetch<PublicExamDetail>(`/public/exams/${encodeURIComponent(idOrSlug)}`, {
    skipRefresh: true,
  });
}

export function submitPublicExamAttempt(
  idOrSlug: string,
  body: {
    userName?: string;
    userAnswers: Record<string, string>;
    elapsedSeconds?: number;
    timedOut?: boolean;
  },
): Promise<ExamSubmitResult> {
  // Include cookies so OptionalJwt can attach authenticated attempts (DEC-045).
  return apiFetch<ExamSubmitResult>(`/public/exams/${encodeURIComponent(idOrSlug)}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function getExamAttemptResult(attemptId: string): Promise<ExamAttemptResult> {
  return apiFetch<ExamAttemptResult>(
    `/public/exams/attempts/${encodeURIComponent(attemptId)}`,
    { skipRefresh: true },
  );
}

export async function uploadAdminExam(input: {
  title: string;
  description?: string;
  durationInMinutes: number;
  file: File;
}): Promise<AdminExamUploadResult> {
  const form = new FormData();
  form.append('title', input.title);
  if (input.description) form.append('description', input.description);
  form.append('durationInMinutes', String(input.durationInMinutes));
  form.append('file', input.file);

  // Must use multipart helper — apiFetch forces application/json and breaks FormData.
  const result = await apiUploadForm<AdminExamUploadResult>('/admin/exams/upload', form);
  return result.data;
}

export function listAdminExams(params?: { cursor?: string; limit?: number }) {
  const sp = new URLSearchParams();
  sp.set('limit', String(params?.limit ?? 20));
  if (params?.cursor) sp.set('cursor', params.cursor);
  return apiFetchResult<
    Array<{
      id: string;
      title: string;
      slug: string;
      totalQuestions: number;
      durationInMinutes: number;
      isPublished: boolean;
      createdAt: string;
      _count: { attempts: number };
    }>
  >(`/admin/exams?${sp.toString()}`);
}

/** Admin / moderator edit view — includes correct answers. */
export function getAdminExam(id: string): Promise<AdminExamDetail> {
  return apiFetch<AdminExamDetail>(`/admin/exams/${encodeURIComponent(id)}`);
}

export function updateAdminExam(
  id: string,
  body: {
    title?: string;
    description?: string | null;
    durationInMinutes?: number;
    isPublished?: boolean;
  },
): Promise<AdminExamDetail> {
  return apiFetch<AdminExamDetail>(`/admin/exams/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function updateAdminExamQuestion(
  examId: string,
  questionId: string,
  body: {
    questionText?: string;
    options?: string[];
    correctOptionIndex?: number;
    explanation?: string | null;
  },
): Promise<AdminExamQuestion> {
  return apiFetch<AdminExamQuestion>(
    `/admin/exams/${encodeURIComponent(examId)}/questions/${encodeURIComponent(questionId)}`,
    { method: 'PATCH', body: JSON.stringify(body) },
  );
}

export function deleteAdminExam(
  id: string,
): Promise<{ id: string; title: string; deletedAttempts: number; deleted: true }> {
  return apiFetch(`/admin/exams/${encodeURIComponent(id)}`, { method: 'DELETE' });
}
