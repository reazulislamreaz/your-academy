'use client';

import Link from 'next/link';
import { Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { LearnerPage, LearnerSection } from '@/components/layout/learner-page';
import { PracticeSetList } from '@/components/practice/practice-set-list';
import { PracticeBrowsePageSkeleton } from '@/components/skeletons';
import { cn } from '@/lib/utils';

type QuizTab = 'daily' | 'subject' | 'topic';

const TABS: { id: QuizTab; label: string; kind: 'DAILY_QUIZ' | 'SUBJECT_QUIZ' | 'TOPIC_QUIZ' }[] = [
  { id: 'daily', label: 'Daily', kind: 'DAILY_QUIZ' },
  { id: 'subject', label: 'Subject', kind: 'SUBJECT_QUIZ' },
  { id: 'topic', label: 'Topic', kind: 'TOPIC_QUIZ' },
];

function QuizzesContent() {
  const sp = useSearchParams();
  const categoryId = sp.get('categoryId') ?? undefined;
  const subcategoryId = sp.get('subcategoryId') ?? undefined;
  const tabParam = sp.get('tab');
  const filteredKind = subcategoryId ? 'TOPIC_QUIZ' : categoryId ? 'SUBJECT_QUIZ' : undefined;

  const activeTab: QuizTab = useMemo(() => {
    if (tabParam === 'subject' || tabParam === 'topic' || tabParam === 'daily') return tabParam;
    if (filteredKind === 'TOPIC_QUIZ') return 'topic';
    if (filteredKind === 'SUBJECT_QUIZ') return 'subject';
    return 'daily';
  }, [filteredKind, tabParam]);

  const active = TABS.find((t) => t.id === activeTab) ?? TABS[0]!;

  return (
    <LearnerPage dense>
      <PageHeader
        eyebrow="Quiz center"
        title="Quizzes"
        description="Daily, subject, and topic quizzes with instant scoring after submit."
      />

      {filteredKind ? (
        <PracticeSetList
          kind={filteredKind}
          categoryId={categoryId}
          subcategoryId={subcategoryId}
          emptyTitle="No matching quizzes"
          emptyDescription="Try clearing filters or open the full quiz center."
        />
      ) : (
        <LearnerSection>
          <div
            role="tablist"
            aria-label="Quiz type"
            className="flex gap-1 overflow-x-auto rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-muted)] p-1"
          >
            {TABS.map((tab) => {
              const href = tab.id === 'daily' ? '/quizzes' : `/quizzes?tab=${tab.id}`;
              const selected = tab.id === activeTab;
              return (
                <Link
                  key={tab.id}
                  href={href}
                  role="tab"
                  aria-selected={selected}
                  className={cn(
                    'min-h-10 min-w-[5.5rem] flex-1 rounded-[calc(var(--radius)-2px)] px-3 text-center text-sm font-semibold whitespace-nowrap transition-colors',
                    selected
                      ? 'bg-[var(--bg-elevated)] text-[var(--ink)] shadow-[var(--shadow-sm)]'
                      : 'text-[var(--muted)] hover:text-[var(--ink)]',
                  )}
                >
                  <span className="inline-flex h-10 items-center justify-center">{tab.label}</span>
                </Link>
              );
            })}
          </div>

          <div className="pt-2">
            <PracticeSetList
              kind={active.kind}
              isDaily={active.kind === 'DAILY_QUIZ'}
              emptyTitle={`No ${active.label.toLowerCase()} quizzes yet`}
              emptyDescription="Check back soon or browse another tab."
            />
          </div>
        </LearnerSection>
      )}
    </LearnerPage>
  );
}

export default function QuizzesPage() {
  return (
    <Suspense fallback={<PracticeBrowsePageSkeleton />}>
      <QuizzesContent />
    </Suspense>
  );
}
