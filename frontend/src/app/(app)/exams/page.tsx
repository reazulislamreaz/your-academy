'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Surface } from '@/components/ui/surface';
import { EXAM_TRACKS } from '@/lib/exam-tags';

export default function ExamsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Government jobs"
        title="Exam preparation tracks"
        description="Browse question banks and practice sets by competitive exam category."
      />
      <div className="motion-stagger grid gap-3 sm:grid-cols-2">
        {EXAM_TRACKS.map((track) => (
          <Surface key={track.tag} elevated interactive className="p-4 sm:p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-[var(--ink)]">
              {track.label}
            </h2>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link
                href={`/questions?examTag=${track.tag}`}
                className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              >
                Question bank
              </Link>
              <Link
                href={`/model-tests?examTag=${track.tag}`}
                className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              >
                Model tests
              </Link>
              <Link
                href={`/previous-year?examTag=${track.tag}`}
                className="font-semibold text-[var(--highlight)] underline-offset-2 hover:underline"
              >
                PY-style sets
              </Link>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}
