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
  status: string;
  difficulty: string;
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
