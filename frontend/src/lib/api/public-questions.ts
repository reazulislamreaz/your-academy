import { apiFetchResult } from './client';

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
};

export async function listPublicQuestions(params: {
  cursor?: string;
  limit?: number;
  q?: string;
  categoryId?: string;
  subcategoryId?: string;
  examTag?: string;
  difficulty?: string;
}) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  qs.set('limit', String(params.limit ?? 20));
  if (params.q) qs.set('q', params.q);
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  if (params.subcategoryId) qs.set('subcategoryId', params.subcategoryId);
  if (params.examTag) qs.set('examTag', params.examTag);
  if (params.difficulty) qs.set('difficulty', params.difficulty);
  return apiFetchResult<PublicQuestionCard[]>(`/public/questions?${qs}`, {
    skipRefresh: true,
  });
}
