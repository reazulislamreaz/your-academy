import { redirect } from 'next/navigation';

/** Legacy path — Learning browse moved to `/preli-questions`; Practice timed to `/preli-practice`. */
export default function PreliminaryLegacyRedirect() {
  redirect('/preli-questions');
}
