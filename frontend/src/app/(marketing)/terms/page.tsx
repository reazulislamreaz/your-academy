import { PageHeader } from '@/components/layout/page-header';
import { Surface } from '@/components/ui/surface';

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8 sm:py-10">
      <PageHeader
        eyebrow="Legal"
        title="Terms of service"
        description="The rules for using Your Academy's practice content and model tests."
      />
      <Surface className="space-y-5 p-6 text-sm leading-relaxed text-[var(--muted-strong)]">
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">The service</h2>
          <p>
            Your Academy provides MCQ and written-question practice, timed model tests, a PDF
            library, and study news for job exam preparation. Content is for personal study use.
            Questions and model answers are provided as study material; we do not guarantee any
            exam outcome.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">Your account</h2>
          <p>
            Register with your own name and WhatsApp number and keep your password private. You
            are responsible for activity on your account. New accounts receive a seven-day trial
            with full access to correct answers and explanations; after the trial, answers and
            explanations are premium while browsing, options, PDFs, and news stay free.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">
            Fair use
          </h2>
          <p>
            Do not copy, resell, or redistribute our question bank, model answers, or PDFs, and
            do not try to bypass the trial, access controls, or exam timers. We may suspend
            accounts that abuse the platform, share credentials widely, or attempt to extract
            restricted answers.
          </p>
        </section>
        <section className="space-y-2">
          <h2 className="font-display text-lg font-semibold text-[var(--ink)]">Changes</h2>
          <p>
            We may update these terms and the service — for example adding subjects, papers, or
            premium plans — and will reflect material changes on this page. Continued use after a
            change means you accept the updated terms.
          </p>
        </section>
        <p className="text-xs text-[var(--muted)]">Last updated: November 2026.</p>
      </Surface>
    </div>
  );
}
