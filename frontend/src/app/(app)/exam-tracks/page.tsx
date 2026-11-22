'use client';

import Link from 'next/link';
import { LearnerPage } from '@/components/layout/learner-page';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { EXAM_TRACKS } from '@/lib/exam-tags';

export default function ExamTracksPage() {
  return (
    <LearnerPage>
      <PageHeader
        eyebrow="Government jobs"
        title="Exam preparation tracks"
        description="Browse question banks and practice sets by competitive exam category."
      />
      <div className="motion-stagger grid gap-3 sm:grid-cols-2">
        {EXAM_TRACKS.map((track) => (
          <Surface key={track.tag} elevated className="flex flex-col gap-4 overflow-x-clip p-3.5 sm:p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-[var(--ink)]">
              {track.label}
            </h2>
            <div className="grid grid-cols-1 gap-2 min-[380px]:grid-cols-3">
              <Link href={`/questions?examTag=${track.tag}`}>
                <Button variant="secondary" size="sm" className="w-full">
                  Questions
                </Button>
              </Link>
              <Link href={`/model-tests?examTag=${track.tag}`}>
                <Button variant="outline" size="sm" className="w-full">
                  Model tests
                </Button>
              </Link>
              <Link href={`/previous-year?examTag=${track.tag}`}>
                <Button variant="ghost" size="sm" className="w-full">
                  PY-style
                </Button>
              </Link>
            </div>
          </Surface>
        ))}
      </div>
    </LearnerPage>
  );
}
