import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, FolderOpen } from 'lucide-react';
import { MarketingPage } from '@/components/layout/marketing-page';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Written Question Bank — Your Academy',
  description:
    'Written exam collections for BCS and government job preparation. Content appears here when admins publish written materials.',
};

/** Honest empty state — Written Question Bank has no published collections yet. */
export default function WrittenQuestionBankPage() {
  return (
    <MarketingPage>
      <PageHeader
        eyebrow="Practice"
        title="Written Question Bank"
        description="Long-form and written exam materials will appear here as they are published."
      />
      <div className="flex flex-1 flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-[var(--line)] bg-[var(--bg-elevated)] px-6 py-16 text-center shadow-[var(--shadow-sm)] sm:py-20">
        <FolderOpen className="mx-auto size-10 text-[var(--muted)] opacity-50" aria-hidden />
        <h2 className="mt-4 font-display text-xl font-bold text-[var(--ink)] sm:text-2xl">
          No written collections yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--muted-strong)]">
          This section is ready for published written content. Until then, practice with the Preli
          MCQ Question Bank.
        </p>
        <Link href="/preli-question-bank" className="mt-6 inline-flex">
          <Button className="rounded-full px-6">
            Open Preli Question Bank
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
      </div>
    </MarketingPage>
  );
}
