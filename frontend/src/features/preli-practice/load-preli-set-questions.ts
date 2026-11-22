import {
  listPublicSetQuestions,
  type PublicQuestionCard,
} from '@/lib/api/public-questions';

const PAGE = 100;

/** Fetch every question in a Preli set (paginated public API). */
export async function loadAllPreliSetQuestions(setId: string): Promise<PublicQuestionCard[]> {
  const items: PublicQuestionCard[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await listPublicSetQuestions(setId, { cursor, limit: PAGE });
    items.push(...page.data);
    const next = page.pagination?.nextCursor;
    if (!next) break;
    cursor = next;
  }
  return items;
}
