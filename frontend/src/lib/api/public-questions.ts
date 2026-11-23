import { apiFetch, apiFetchResult, serverApiBase } from './client';
import type { ApiResult } from './client';
import type { PublicPracticeScore } from '@your-academy/shared';

export type PublicQuestionCard = {
  id: string;
  title: string;
  content: string;
  difficulty: string;
  examTags: string[];
  sourceNote: string | null;
  sourceLabel: string | null;
  sourceSerial: string | null;
  examYear: string | null;
  sectionTitle: string | null;
  category: { id: string; name: string; slug: string };
  subcategory: { id: string; name: string; slug: string } | null;
  options: Array<{ id: string; label: string; content: string; sortOrder: number }>;
  /** DEC-051: omitted unless the viewer is entitled (admin / active subscription). */
  correctAnswerLabel?: string;
  correctAnswerBn?: string;
  createdAt: string;
  publishedAt: string | null;
  uploadBatchId?: string | null;
  rowNumber?: number | null;
};

export type PublicQuestionSet = {
  id: string;
  batchCode: string;
  title: string;
  description: string | null;
  subject: string | null;
  topic: string | null;
  examCategory: string | null;
  examYear: string | null;
  sheetPreamble: string | null;
  questionCount: number;
  uploadedAt: string;
  importedAt: string | null;
  placements: Array<{
    subcategoryId: string;
    subcategoryName: string;
    categoryId: string;
    categoryName: string;
  }>;
};

export async function listPublicQuestionSets(params: {
  cursor?: string;
  limit?: number;
  q?: string;
  categoryId?: string;
  subcategoryId?: string;
  year?: string;
}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  qs.set('limit', String(params.limit ?? 20));
  if (params.q) qs.set('q', params.q);
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  if (params.subcategoryId) qs.set('subcategoryId', params.subcategoryId);
  if (params.year) qs.set('year', params.year);
  return apiFetchResult<PublicQuestionSet[]>(`/public/question-sets?${qs}`, {
    skipRefresh: true,
  });
}

export async function listPublicQuestionSetYears() {
  return apiFetch<string[]>('/public/question-sets/years', { skipRefresh: true });
}

export async function getPublicQuestionSet(id: string) {
  return apiFetch<PublicQuestionSet>(`/public/question-sets/${id}`, {
    skipRefresh: true,
  });
}

export async function listPublicSetQuestions(
  setId: string,
  params: { cursor?: string; limit?: number; q?: string },
) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  qs.set('limit', String(params.limit ?? 20));
  if (params.q) qs.set('q', params.q);
  return apiFetchResult<PublicQuestionCard[]>(
    `/public/question-sets/${setId}/questions?${qs}`,
    { skipRefresh: true },
  );
}

export async function listPublicQuestions(params: {
  cursor?: string;
  limit?: number;
  q?: string;
  categoryId?: string;
  subcategoryId?: string;
  examTag?: string;
  difficulty?: string;
  uploadBatchId?: string;
}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  qs.set('limit', String(params.limit ?? 20));
  if (params.q) qs.set('q', params.q);
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  if (params.subcategoryId) qs.set('subcategoryId', params.subcategoryId);
  if (params.examTag) qs.set('examTag', params.examTag);
  if (params.difficulty) qs.set('difficulty', params.difficulty);
  if (params.uploadBatchId) qs.set('uploadBatchId', params.uploadBatchId);
  return apiFetchResult<PublicQuestionCard[]>(`/public/questions?${qs}`, {
    skipRefresh: true,
  });
}

/** RSC prefetch for marketing homepage MCQ preview. */
export async function getPublicQuestionsServer(params: {
  limit?: number;
}): Promise<ApiResult<PublicQuestionCard[]> | null> {
  try {
    const qs = new URLSearchParams();
    qs.set('limit', String(params.limit ?? 1));
    const res = await fetch(`${serverApiBase()}/public/questions?${qs}`, {
      next: { revalidate: 60, tags: ['public-questions'] },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success: boolean;
      data?: PublicQuestionCard[];
      meta?: { pagination?: ApiResult<PublicQuestionCard[]>['pagination'] };
    };
    if (!json.success || !json.data) return null;
    return { data: json.data, pagination: json.meta?.pagination };
  } catch {
    return null;
  }
}

/** DEC-051 — server-side Preli Practice scoring (answer key never ships to free viewers). */
export async function scorePublicSetPractice(setId: string, answers: Record<string, string>) {
  return apiFetch<PublicPracticeScore>(
    `/public/question-sets/${encodeURIComponent(setId)}/practice-score`,
    {
      method: 'POST',
      body: JSON.stringify({ answers }),
      skipRefresh: true,
    },
  );
}
