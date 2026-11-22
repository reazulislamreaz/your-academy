import { redirect } from 'next/navigation';

/**
 * Legacy PracticeSet quiz-center route.
 * Practice → Quiz now uses the working live Quiz experience at `/live-quizzes`.
 */
export default function QuizzesRedirectPage() {
  redirect('/live-quizzes');
}
