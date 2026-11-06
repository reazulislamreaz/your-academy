import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8 sm:py-10">
      <PageHeader
        eyebrow="About"
        title="About Your Academy"
        description="Free MCQ practice for Bangladesh's government and bank job exams — built to stay useful whether you are on day one of your trial or month six of preparation."
      />
      <Surface className="space-y-4 p-6">
        <h2 className="font-display text-xl font-semibold">What we do</h2>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          Your Academy is a practice platform for BCS, Bank, Primary, NTRCA, PSC, and other
          government job exams. You get a searchable question bank, subject-wise practice, timed
          model tests built from past exam papers, written questions with model answers, a free
          PDF library, and study news — all in one place.
        </p>
        <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
          Registration is free and takes a WhatsApp number and a password. Every new account gets
          a seven-day trial with full access to correct answers and explanations. After the trial,
          you can keep browsing questions, options, PDFs, and news — correct answers and
          explanations become premium.
        </p>
        <h2 className="font-display text-xl font-semibold">How to use it</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-[var(--muted-strong)]">
          <li>Pick topics during onboarding, or browse the full question bank by category.</li>
          <li>Practice one question at a time, check your answer, and save the ones to revisit.</li>
          <li>Sit a timed model test from an exam paper to rehearse under real conditions.</li>
          <li>Track attempted, correct, and accuracy on your profile and study home.</li>
        </ul>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link href="/register">
            <Button size="sm">Start free trial</Button>
          </Link>
          <Link href="/exams">
            <Button size="sm" variant="outline">
              Browse exam papers
            </Button>
          </Link>
        </div>
      </Surface>
    </div>
  );
}
