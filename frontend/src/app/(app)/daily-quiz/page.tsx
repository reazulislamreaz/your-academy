import { redirect } from 'next/navigation';

/** Legacy daily-quiz shortcut — Practice Quiz lives at `/live-quizzes`. */
export default function DailyQuizRedirectPage() {
  redirect('/live-quizzes');
}
