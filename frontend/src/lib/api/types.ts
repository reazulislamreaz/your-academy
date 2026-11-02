export type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  children: Array<{ id: string; name: string; slug: string }>;
};

export type PublicStats = {
  questions: number;
  categories: number;
  news: number;
  documents: number;
};

export type NewsListItem = {
  id: string;
  title: string;
  slug: string;
  summary?: string | null;
  publishedAt?: string | null;
};

export type QuestionListItem = {
  id: string;
  title: string;
  difficulty: string;
  category: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string } | null;
  publishedAt?: string | null;
};

export type QuestionDetail = {
  id: string;
  title: string;
  content: string;
  explanation?: string;
  difficulty: string;
  options: Array<{
    id: string;
    label: string;
    content: string;
    isCorrect?: boolean;
    sortOrder?: number;
  }>;
  category: { id: string; name: string; slug: string };
  subcategory?: { id: string; name: string; slug: string } | null;
  publishedAt?: string | null;
  bookmarked: boolean;
  answersVisible: boolean;
};

export type DocumentListItem = {
  id: string;
  title: string;
  description?: string | null;
  visibility: string;
  category?: { id: string; name: string } | null;
  updatedAt: string;
};
