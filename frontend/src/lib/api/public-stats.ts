import { serverApiBase } from './client';

export type PublicPlatformStats = {
  questions: number;
  categories: number;
  news: number;
  documents: number;
  questionSets: number;
};

/** Server Component fetch — verified counts from GET /public/stats. */
export async function getPublicPlatformStats(): Promise<PublicPlatformStats | null> {
  try {
    const res = await fetch(`${serverApiBase()}/public/stats`, {
      next: { revalidate: 60, tags: ['public-stats'] },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success: boolean;
      data?: PublicPlatformStats;
    };
    if (!json.success || !json.data) return null;
    return json.data;
  } catch {
    return null;
  }
}
