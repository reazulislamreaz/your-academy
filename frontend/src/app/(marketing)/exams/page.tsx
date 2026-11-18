import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock3, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { serverApiBase } from '@/lib/api/client';
import type { PublicExamListItem } from '@your-academy/shared';

export const metadata: Metadata = {
  title: 'Exams & Quizzes',
  description: 'Take timed public exams on Your Academy — newest first.',
};

async function fetchExams(): Promise<PublicExamListItem[]> {
  try {
    const res = await fetch(`${serverApiBase()}/public/exams`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { success?: boolean; data?: PublicExamListItem[] };
    return json.success && Array.isArray(json.data) ? json.data : [];
  } catch {
    return [];
  }
}

export default async function PublicExamsPage() {
  const exams = await fetchExams();

  return (
    <div className="marketing-container px-4 py-10 sm:px-6 sm:py-14">
      <header className="mx-auto max-w-2xl text-center">
        <p className="text-[0.7rem] font-semibold tracking-[0.16em] text-[var(--muted)] uppercase">
          Live exams
        </p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-4xl">
          Exams & Quizzes
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted-strong)] sm:text-base">
          Timed practice exams — enter your name, beat the clock, and review your answer sheet.
        </p>
      </header>

      {exams.length === 0 ? (
        <div className="mx-auto mt-10 max-w-lg">
          <EmptyState
            title="No exams published yet"
            description="New timed exams will appear here as soon as they are uploaded."
          />
        </div>
      ) : (
        <ul className="mx-auto mt-10 grid max-w-4xl gap-4 sm:grid-cols-2">
          {exams.map((exam) => (
            <li
              key={exam.id}
              className="flex flex-col rounded-[var(--radius-xl)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]"
            >
              <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)]">
                {exam.title}
              </h2>
              {exam.description ? (
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-[var(--muted-strong)]">
                  {exam.description}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--muted-strong)]">
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-4" aria-hidden />
                  {exam.durationInMinutes} Mins
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ListChecks className="size-4" aria-hidden />
                  {exam.totalQuestions} Questions
                </span>
              </div>
              <div className="mt-5">
                <Link href={`/exams/${exam.slug}`}>
                  <Button className="w-full sm:w-auto">Start Exam</Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
