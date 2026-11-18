import type {
  AdminExamUploadResult,
  ExamAttemptResult,
  ExamSubmitResult,
  PublicExamDetail,
  PublicExamListItem,
} from '@your-academy/shared';
import { apiFetch } from './client';
import { apiUploadForm } from './upload';

export function listPublicExams(): Promise<PublicExamListItem[]> {
  return apiFetch<PublicExamListItem[]>('/public/exams', { skipRefresh: true });
}

export function getPublicExam(idOrSlug: string): Promise<PublicExamDetail> {
  return apiFetch<PublicExamDetail>(`/public/exams/${encodeURIComponent(idOrSlug)}`, {
    skipRefresh: true,
  });
}

export function submitPublicExamAttempt(
  idOrSlug: string,
  body: {
    userName: string;
    userAnswers: Record<string, string>;
    elapsedSeconds?: number;
    timedOut?: boolean;
  },
): Promise<ExamSubmitResult> {
  return apiFetch<ExamSubmitResult>(`/public/exams/${encodeURIComponent(idOrSlug)}/attempts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    skipRefresh: true,
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

export function listAdminExams() {
  return apiFetch<
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
  >('/admin/exams');
}
