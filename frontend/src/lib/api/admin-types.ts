export type AdminQuestionListItem = {
  id: string;
  title: string;
  status: string;
  difficulty: string;
  updatedAt: string;
  publishedAt?: string | null;
  category: { id: string; name: string };
  subcategory?: { id: string; name: string } | null;
};

export type AdminQuestionDetail = {
  id: string;
  title: string;
  content: string;
  explanation?: string | null;
  modelAnswer?: string | null;
  status: string;
  difficulty: string;
  kind?: string;
  categoryId: string;
  subcategoryId?: string | null;
  options: Array<{
    id: string;
    label: string;
    content: string;
    isCorrect: boolean;
    sortOrder: number;
  }>;
  category: { id: string; name: string };
  subcategory?: { id: string; name: string } | null;
};

export type AdminNewsItem = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  updatedAt: string;
};

export type AdminNewsDetail = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  body: string;
  isPublished: boolean;
  publishedAt?: string | null;
  documentIds?: string[];
  documents?: Array<{
    id: string;
    title: string;
    visibility: string;
    isPublished: boolean;
  }>;
};

export type AdminDocumentItem = {
  id: string;
  title: string;
  description?: string | null;
  visibility: string;
  isPublished: boolean;
  category?: { id: string; name: string } | null;
  mediaAsset?: { originalFilename?: string | null; mimeType: string; bytes: number } | null;
  updatedAt: string;
};

export type AdminExamPaperItem = {
  id: string;
  title: string;
  slug: string;
  examBody: string;
  year?: number | null;
  description?: string | null;
  durationMinutes: number;
  totalMarks?: number | null;
  isPublished: boolean;
  publishedAt?: string | null;
  questionCount: number;
};

export type AdminExamPaperDetail = AdminExamPaperItem & {
  questions: Array<{
    id: string;
    title: string;
    kind: string;
    difficulty: string;
    status: string;
    sortOrder: number;
    category: { id: string; name: string };
  }>;
};
