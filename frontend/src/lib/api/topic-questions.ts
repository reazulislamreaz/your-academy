import { apiFetch, apiFetchResult } from '@/lib/api/client';
import { apiUploadForm } from '@/lib/api/upload';
import type { PublicQuestionCard } from '@/lib/api/public-questions';

export type TopicDirectoryRoot = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconKey?: string | null;
  sortOrder: number;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    iconKey?: string | null;
    sortOrder: number;
    questionCount: number;
    parentId: string;
    parentName: string;
  }>;
};

export type TopicSubcategoryDetail = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconKey?: string | null;
  questionCount: number;
  category: { id: string; name: string; slug: string; iconKey?: string | null };
};

export type TopicQuestionCard = PublicQuestionCard & {
  examLabel?: string | null;
};

export type TopicUploadBatchSummary = {
  id: string;
  batchCode: string;
  displayName: string;
  originalFilename?: string;
  status: string;
  category: { id: string; name: string };
  subcategory: { id: string; name: string; iconKey?: string | null };
  totalRows: number;
  importedCount: number;
  questionCount?: number;
  createdAt: string;
  uploadedBy?: { id: string; name: string };
};

export type TopicImportStats = {
  totalCollections: number;
  totalRowsProcessed: number;
  successfullyImported: number;
  duplicateQuestions: number;
  failedImports: number;
  recentUploads: TopicUploadBatchSummary[];
};

export function fetchTopicDirectory(): Promise<TopicDirectoryRoot[]> {
  return apiFetch<TopicDirectoryRoot[]>('/public/topic-directory', { skipRefresh: true });
}

export function getTopicSubcategory(id: string): Promise<TopicSubcategoryDetail> {
  return apiFetch<TopicSubcategoryDetail>(`/public/topic-subcategories/${id}`, {
    skipRefresh: true,
  });
}

export function listTopicQuestions(
  subcategoryId: string,
  params: { cursor?: string; limit?: number; q?: string } = {},
) {
  const sp = new URLSearchParams();
  if (params.cursor) sp.set('cursor', params.cursor);
  sp.set('limit', String(params.limit ?? 20));
  if (params.q) sp.set('q', params.q);
  return apiFetchResult<TopicQuestionCard[]>(
    `/public/topic-subcategories/${subcategoryId}/questions?${sp}`,
    { skipRefresh: true },
  );
}

export function listAdminTopicImports() {
  return apiFetch<TopicUploadBatchSummary[]>('/admin/topic-question-imports');
}

export function getAdminTopicImportStats() {
  return apiFetch<TopicImportStats>('/admin/topic-question-imports/stats');
}

export async function uploadTopicQuestions(input: {
  file: File;
  categoryId: string;
  subcategoryId: string;
  displayName?: string;
}) {
  const form = new FormData();
  form.append('file', input.file);
  form.append('categoryId', input.categoryId);
  form.append('subcategoryId', input.subcategoryId);
  if (input.displayName?.trim()) form.append('displayName', input.displayName.trim());
  const res = await apiUploadForm<TopicUploadBatchSummary>(
    '/admin/topic-question-imports/upload',
    form,
  );
  return res.data;
}
