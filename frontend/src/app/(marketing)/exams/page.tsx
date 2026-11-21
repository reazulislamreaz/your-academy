import type { Metadata } from 'next';
import { QuizListing } from '@/features/guest-exams/quiz-listing';

export const metadata: Metadata = {
  title: 'Quiz',
  description: 'Take timed public quizzes on Your Academy — newest first.',
};

export default function PublicExamsPage() {
  return <QuizListing />;
}
