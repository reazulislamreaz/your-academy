import Link from 'next/link';
import { Clock3, ListChecks } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Surface } from '@/components/ui/surface';
import type { PracticeSetListItem } from '@/lib/api/types';
import { examLabel, practiceKindLabel } from '@/lib/exam-tags';

export function PracticeSetCard({ set }: { set: PracticeSetListItem }) {
  const minutes =
    set.durationSeconds != null ? Math.max(1, Math.round(set.durationSeconds / 60)) : null;

  return (
    <Surface interactive className="p-4 hover:border-[var(--highlight)]/40">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="highlight">{practiceKindLabel(set.kind)}</Badge>
            {set.examTag ? <Badge variant="outline">{examLabel(set.examTag)}</Badge> : null}
          </div>
          <h3 className="font-display text-base font-semibold text-[var(--ink)]">
            <Link href={`/practice/${set.slug}`} className="hover:text-[var(--highlight)]">
              {set.title}
            </Link>
          </h3>
          {set.description ? (
            <p className="line-clamp-2 text-sm leading-relaxed text-[var(--muted-strong)]">{set.description}</p>
          ) : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[var(--muted-strong)]">
        <span className="inline-flex items-center gap-1">
          <ListChecks className="size-3.5" aria-hidden />
          {set.questionCount} questions
        </span>
        {minutes != null ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="size-3.5" aria-hidden />
            {minutes} min
          </span>
        ) : (
          <span>Untimed</span>
        )}
        {set.negativeMarkPerWrong > 0 ? (
          <span>−{set.negativeMarkPerWrong} wrong</span>
        ) : null}
        {set.category ? <span>{set.category.name}</span> : null}
      </div>
      <div className="mt-4">
        <Link
          href={`/practice/${set.slug}`}
          className="text-sm font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
        >
          Open set →
        </Link>
      </div>
    </Surface>
  );
}
