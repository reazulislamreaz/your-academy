import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';

const faqs = [
  {
    q: 'Is Your Academy free?',
    a: 'Registration is free. Every new account gets a seven-day trial with full access to correct answers and explanations. After the trial, browsing questions, options, PDFs, and news stays free — correct answers and explanations become premium.',
  },
  {
    q: 'How do I register?',
    a: 'Register with your name, WhatsApp number, and a password. An email address is optional at registration, but you will need one on your account if you ever want to reset your password by email.',
  },
  {
    q: 'What is a model test?',
    a: 'A timed exam built from a past exam paper — for example a BCS preliminary paper. You get a fixed duration, one question at a time, and your answers are saved as you go. The timer auto-submits when time runs out, and you can re-view your result afterwards.',
  },
  {
    q: 'Will I always see my score?',
    a: 'Yes. Your score and correct / wrong / unanswered counts are always visible to you on the result page and in your results history. Per-question correct answers and explanations follow the same rule as practice: they unlock during your trial or with a future premium plan.',
  },
  {
    q: 'What are written questions?',
    a: 'Written (CQ-style) questions have no options. Instead of a key, they carry a model answer that shows the expected response. Model answers follow the same trial / premium rule as MCQ explanations.',
  },
  {
    q: 'Can I save questions and PDFs for later?',
    a: 'Yes. Save any question or PDF from its page, and find everything under Saved. Your profile also tracks attempted, correct, and accuracy across practice and exams, plus study time.',
  },
  {
    q: 'Do I need to install an app?',
    a: 'No. Your Academy works in the browser on phone and desktop. Keep the study tab open while you practice and your study time is tracked.',
  },
  {
    q: 'I forgot my password. What now?',
    a: 'Use “Forgot password” on the sign-in page. Reset links go by email, so this only works if your account has an email address saved. You can add one from your profile.',
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 px-6 py-8 sm:py-10">
      <PageHeader
        eyebrow="Help"
        title="Frequently asked questions"
        description="How trials, model tests, written questions, and results work on Your Academy."
      />
      <Surface className="space-y-6 p-6">
        {faqs.map((item) => (
          <div key={item.q} className="space-y-1.5">
            <h2 className="font-display text-lg font-semibold tracking-tight">{item.q}</h2>
            <p className="text-sm leading-relaxed text-[var(--muted-strong)]">{item.a}</p>
          </div>
        ))}
        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-5">
          <Link href="/about">
            <Button size="sm" variant="outline">
              About Your Academy
            </Button>
          </Link>
          <Link href="/exams">
            <Button size="sm">Browse exam papers</Button>
          </Link>
        </div>
      </Surface>
    </div>
  );
}
