/** One row in the unified Saved list — a bookmarked MCQ or a bookmarked PDF. */
export type SavedItemKind = 'question' | 'document';

export type FolderRef = { id: string; name: string } | null;

/**
 * Saved MCQ as returned by `GET /bookmarks/questions/details` (key + explanation
 * included; MCQs from locked sets are left out by the API — DEC-060).
 */
export type SavedQuestionDetail = {
  id: string;
  title: string;
  content: string;
  difficulty: string;
  sectionTitle?: string | null;
  category: { id: string; name: string };
  subcategory?: { id: string; name: string } | null;
  options: Array<{ id: string; label: string; content: string; isCorrect: boolean }>;
  explanation: string | null;
};

export type QuestionDetailRow = {
  id: string;
  createdAt: string;
  collection: FolderRef;
  question: SavedQuestionDetail;
};

export type SavedQuestionDetailsPage = {
  items: QuestionDetailRow[];
};

export type DocumentBookmarkRow = {
  id: string;
  createdAt: string;
  collection?: FolderRef;
  document: { id: string; title: string; visibility: string };
};

export type SavedItem = {
  /** Stable across both kinds (`q:<id>` / `d:<id>`) — bookmark ids may collide between tables. */
  key: string;
  kind: SavedItemKind;
  /** Question or document id (not the bookmark id). */
  id: string;
  title: string;
  subtitle: string | null;
  savedAt: string;
  folder: FolderRef;
  /** Present for MCQs — the full stem and options for View All. */
  question?: SavedQuestionDetail;
};

type Stream<T> = { rows: T[]; hasMore: boolean };

/**
 * Merges the two cursor-paginated bookmark streams (each newest-first) into one
 * newest-first list. While a stream still has pages, rows older than its last
 * loaded row are held back so "Load more" appends rather than reshuffling.
 */
export function mergeSavedItems(
  questions: Stream<QuestionDetailRow>,
  documents: Stream<DocumentBookmarkRow>,
): SavedItem[] {
  const items: SavedItem[] = [
    ...questions.rows.map<SavedItem>((b) => ({
      key: `q:${b.question.id}`,
      kind: 'question',
      id: b.question.id,
      title: b.question.title,
      subtitle: b.question.subcategory
        ? `${b.question.category.name} / ${b.question.subcategory.name}`
        : b.question.category.name,
      savedAt: b.createdAt,
      folder: b.collection ?? null,
      question: b.question,
    })),
    ...documents.rows.map<SavedItem>((b) => ({
      key: `d:${b.document.id}`,
      kind: 'document',
      id: b.document.id,
      title: b.document.title,
      subtitle: null,
      savedAt: b.createdAt,
      folder: b.collection ?? null,
    })),
  ];

  const cutoffs = [
    questions.hasMore ? questions.rows.at(-1)?.createdAt : undefined,
    documents.hasMore ? documents.rows.at(-1)?.createdAt : undefined,
  ]
    .filter((v): v is string => Boolean(v))
    .map((v) => Date.parse(v));
  const cutoff = cutoffs.length ? Math.max(...cutoffs) : Number.NEGATIVE_INFINITY;

  return items
    .filter((item) => Date.parse(item.savedAt) >= cutoff)
    .sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt) || a.key.localeCompare(b.key));
}
