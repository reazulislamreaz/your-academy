'use client';

import { PageHeader } from '@/components/layout/page-header';
import { PracticeSetList } from '@/components/practice/practice-set-list';

export default function DailyQuizPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Daily habit"
        title="Daily quiz"
        description="Short published daily sets to keep exam prep consistent."
      />
      <PracticeSetList
        kind="DAILY_QUIZ"
        isDaily
        emptyTitle="No daily quiz published"
        emptyDescription="When an admin publishes a daily quiz, it will appear here."
      />
    </div>
  );
}
