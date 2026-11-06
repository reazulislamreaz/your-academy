import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { ListRow } from '@/components/ui/list-row';
import { Surface } from '@/components/ui/surface';
import { serverFetch } from '@/lib/api/client';
import type { ExamPaperMeta } from '@/lib/api/types';

function paperMeta(paper: ExamPaperMeta) {
  return (
    <>
      <Badge variant="highlight">{paper.examBody}</Badge>
      {paper.year ? <span>{paper.year}</span> : null}
      <span>{paper.questionCount} questions</span>
      <span>{paper.durationMinutes} min</span>
      {paper.totalMarks != null ? <span>{paper.totalMarks} marks</span> : null}
    </>
  );
}

export default async function ExamsIndexPage() {
  const papers = (await serverFetch<ExamPaperMeta[]>('/exam-papers')) ?? [];
  const groups = new Map<string, ExamPaperMeta[]>();
  for (const paper of papers) {
    const list = groups.get(paper.examBody) ?? [];
    list.push(paper);
    groups.set(paper.examBody, list);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-6 py-8 sm:py-10">
      <PageHeader
        eyebrow="Model tests"
        title="Job exam papers"
        description="Timed model tests built from past exam papers. Sign in to practice a paper or sit a timed exam — answers and explanations unlock during your seven-day trial."
        actions={
          <Link href="/exams/results">
            <Button variant="soft" size="sm">
              My results
            </Button>
          </Link>
        }
      />

      {papers.length === 0 ? (
        <EmptyState
          title="No exam papers yet"
          description="Papers appear here once an admin publishes them. Meanwhile, the question bank is open for practice."
          action={
            <Link href="/questions">
              <Button size="sm">Browse questions</Button>
            </Link>
          }
        />
      ) : null}

      {[...groups.entries()].map(([examBody, items]) => (
        <section key={examBody} className="space-y-3">
          <h2 className="font-display text-xl font-semibold tracking-tight">{examBody}</h2>
          <Surface quiet>
            <div className="divide-y divide-[var(--line)]">
              {items.map((paper) => (
                <ListRow
                  key={paper.id}
                  href={`/exams/${paper.slug}`}
                  meta={paperMeta(paper)}
                  title={
                    <span className="font-display text-lg font-semibold tracking-tight">
                      {paper.title}
                    </span>
                  }
                  description={paper.description ?? undefined}
                  trailing={
                    <span className="flex items-center gap-2">
                      <span className="hidden text-sm font-semibold text-[var(--highlight)] sm:inline">
                        Practice
                      </span>
                      <ChevronRight className="h-4 w-4 text-[var(--muted)]" aria-hidden />
                    </span>
                  }
                />
              ))}
            </div>
          </Surface>
        </section>
      ))}
    </div>
  );
}
