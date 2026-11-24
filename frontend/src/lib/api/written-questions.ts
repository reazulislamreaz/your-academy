import { apiFetch, apiFetchResult } from './client';
import type { PublicQuestionSet } from './public-questions';

export type PublicWrittenQuestionCard = {
  id: string;
  title: string;
  content: string;
  modelAnswer: string | null;
  marks: string | null;
  sourceSerial: string | null;
  examYear: string | null;
  sectionTitle: string | null;
  category: { id: string; name: string; slug: string };
  subcategory: { id: string; name: string; slug: string } | null;
  createdAt: string;
  publishedAt: string | null;
  uploadBatchId?: string | null;
  rowNumber?: number | null;
};

export type PublicWrittenQuestionSet = PublicQuestionSet;

export async function listPublicWrittenQuestionSets(params: {
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
  return apiFetchResult<PublicWrittenQuestionSet[]>(`/public/written-question-sets?${qs}`, {
    skipRefresh: true,
  });
}

export async function listPublicWrittenQuestionSetYears() {
  return apiFetch<string[]>('/public/written-question-sets/years', { skipRefresh: true });
}

export async function getPublicWrittenQuestionSet(id: string) {
  return apiFetch<PublicWrittenQuestionSet>(`/public/written-question-sets/${id}`, {
    skipRefresh: true,
  });
}

export async function listPublicWrittenSetQuestions(
  setId: string,
  params: { cursor?: string; limit?: number; q?: string },
) {
  const qs = new URLSearchParams();
  if (params.cursor) qs.set('cursor', params.cursor);
  qs.set('limit', String(params.limit ?? 20));
  if (params.q) qs.set('q', params.q);
  return apiFetchResult<PublicWrittenQuestionCard[]>(
    `/public/written-question-sets/${setId}/questions?${qs}`,
    { skipRefresh: true },
  );
}
