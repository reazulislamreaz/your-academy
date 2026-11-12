import { apiFetch, apiFetchResult } from './client';

export type PublicQuestionCard = {
  id: string;
  title: string;
  content: string;
  difficulty: string;
  examTags: string[];
  sourceNote: string | null;
  sourceLabel: string | null;
  category: { id: string; name: string; slug: string };
  subcategory: { id: string; name: string; slug: string } | null;
  options: Array<{ id: string; label: string; content: string; sortOrder: number }>;
  correctAnswerLabel: string;
  correctAnswerBn: string;
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
  questionCount: number;
  uploadedAt: string;
  importedAt: string | null;
};

export async function listPublicQuestionSets(params: {
  cursor?: string;
  limit?: number;
  q?: string;
  categoryId?: string;
}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  qs.set('limit', String(params.limit ?? 20));
  if (params.q) qs.set('q', params.q);
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  return apiFetchResult<PublicQuestionSet[]>(`/public/question-sets?${qs}`, {
    skipRefresh: true,
  });
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
