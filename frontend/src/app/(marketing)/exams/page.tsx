import type { Metadata } from 'next';
import { QuizListing } from '@/features/guest-exams/quiz-listing';
import { getPageHeader, pageHeaderMetadata } from '@/lib/site-content';

/** DEC-069 — header + SEO from Admin → Page Headers (defaults = previous text). */
export async function generateMetadata(): Promise<Metadata> {
  return pageHeaderMetadata(await getPageHeader('quiz'), '/exams');
}

export default async function PublicExamsPage() {
  const header = await getPageHeader('quiz');
  return <QuizListing header={header} />;
}
