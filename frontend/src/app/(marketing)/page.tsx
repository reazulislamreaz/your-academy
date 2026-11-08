import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  BookOpenText,
  Calculator,
  CheckCircle2,
  Flag,
  Globe,
  GraduationCap,
  Landmark,
  Languages,
  Percent,
  Settings,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SampleMcq } from '@/components/marketing/sample-mcq';
import { NewsletterBar } from '@/components/marketing/newsletter-bar';
import { serverFetch } from '@/lib/api/client';
import type { CategoryNode } from '@/lib/api/types';

/**
 * Homepage matching the approved design (navy #0A1F44 + red #E63946).
 * Category/topic cards use the design's fixed five, linked to the matching
 * live category/subcategory when one exists, otherwise to /questions.
 */
const CATEGORY_CARDS = [
  { name: 'BCS', sub: '(Preliminary + Written)', icon: ShieldCheck, match: ['bcs'] },
  { name: 'Bank', sub: '(Officer & SO)', icon: Landmark, match: ['bank'] },
  { name: 'Government Jobs', sub: '', icon: Flag, match: ['government', 'govt'] },
  { name: 'Primary & NTRCA', sub: '', icon: GraduationCap, match: ['primary', 'ntrca'] },
  { name: 'Other Govt. Jobs', sub: '', icon: Settings, match: ['other'] },
] as const;

const TOPIC_CARDS = [
  { name: 'Bangla', icon: BookOpenText, highlight: true, match: ['bangla'] },
  { name: 'English', icon: Languages, highlight: false, match: ['english'] },
  { name: 'Math', icon: Calculator, highlight: false, match: ['math'] },
  { name: 'GK', icon: Globe, highlight: false, match: ['gk', 'general knowledge'] },
  { name: 'Others', icon: Settings, highlight: false, match: [] },
] as const;

const WHY_POINTS = [
  'Weekly Update Question Bank',
  'Chapter-wise MCQ Practice',
  'প্রতিদিন পত্রিকার গুরুত্বপূর্ণ কলাম',
  'Unlimited Exam Practice',
  'Regular Update',
  'Performance Update',
];

/** Red dash used above section titles in the design. */
function SectionDash() {
  return (
    <span aria-hidden className="block h-[3px] w-8 rounded-full bg-[var(--highlight)]" />
  );
}

export default async function HomePage() {
  const categories = (await serverFetch<CategoryNode[]>('/categories')) ?? [];
  const roots = categories.slice(0, 6);

  const categoryHref = (match: readonly string[]) => {
    const found = roots.find((cat) =>
      match.some((m) => cat.name.toLowerCase().includes(m)),
    );
    return found ? `/questions?categoryId=${found.id}` : '/questions';
  };

  const topicHref = (match: readonly string[]) => {
    if (match.length === 0) return '/questions';
    for (const cat of roots) {
      const child = cat.children.find((c) =>
        match.some((m) => c.name.toLowerCase().includes(m)),
      );
      if (child) return `/questions?subcategoryId=${child.id}`;
    }
    return '/questions';
  };

  return (
    <div>
      {/* Hero — navy panel, curved photo with red swoosh on the right */}
      <section className="relative overflow-hidden bg-[var(--bg-inverse)] text-white">
        <svg aria-hidden width="0" height="0" className="absolute">
          <defs>
            <clipPath id="hero-curve" clipPathUnits="objectBoundingBox">
              <path d="M0.30 0H1V1H0.02C0.20 0.72 0.34 0.28 0.30 0Z" />
            </clipPath>
          </defs>
        </svg>
        <div aria-hidden className="absolute inset-y-0 right-0 hidden w-[56%] lg:block">
          <div
            className="absolute inset-0 translate-x-[-14px] bg-[var(--highlight)]"
            style={{ clipPath: 'url(#hero-curve)' }}
          />
          <div className="absolute inset-0" style={{ clipPath: 'url(#hero-curve)' }}>
            <Image
              src="/images/hero-students.jpg"
              alt="Students studying together on a lawn in front of the National Parliament in Dhaka"
              fill
              priority
              className="object-cover"
            />
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-7xl px-6 py-16 lg:py-24">
          <div className="motion-rise max-w-[44rem] space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
              <GraduationCap className="h-4 w-4 text-white" aria-hidden />
              Bangladesh&apos;s Premier Job Exam Preparation Platform
            </p>
            <h1 className="font-display text-[clamp(2.5rem,4vw,3.25rem)] leading-[1.02] font-extrabold tracking-tight">
              Your Dream Job Starts{' '}
              <span className="relative inline-block text-[var(--highlight)]">
                Here!
                <svg
                  aria-hidden
                  viewBox="0 0 120 12"
                  className="absolute -bottom-1 left-0 w-full"
                  fill="none"
                >
                  <path
                    d="M2 9 Q 60 2 118 8"
                    stroke="#e63946"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-white/70">
              Practice MCQs, Get Expert Solutions, and Boost Your Preparation for Govt. &amp; Bank
              Jobs.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/register">
                <Button size="lg" className="rounded-full px-7">
                  Start Practicing
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/exams">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/40 bg-white/5 px-7 text-white hover:border-white/70 hover:bg-white/10"
                >
                  Explore Job Exams
                </Button>
              </Link>
            </div>
            <dl className="flex flex-wrap gap-x-10 gap-y-4 pt-2">
              {[
                { icon: Users, value: '1M+', label: 'Students' },
                { icon: BookOpen, value: '50+', label: 'Job Exams' },
                { icon: Trophy, value: '100%', label: 'Focused on Your Success' },
              ].map(({ icon: Icon, value, label }) => (
                <div key={label} className="flex items-center gap-3">
                  <Icon className="h-7 w-7 text-white/80" aria-hidden />
                  <div>
                    <dt className="sr-only">{label}</dt>
                    <dd className="font-display text-xl leading-none font-bold">{value}</dd>
                    <dd className="mt-1 text-xs text-white/60">{label}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
          <div className="motion-rise relative mt-12 lg:hidden">
            <div
              aria-hidden
              className="absolute -top-3 -right-3 bottom-6 left-6 rounded-tl-[9rem] rounded-tr-[var(--radius-xl)] rounded-br-[var(--radius-xl)] rounded-bl-[var(--radius-xl)] border-[3px] border-[var(--highlight)]"
            />
            <div className="relative overflow-hidden rounded-tl-[9rem] rounded-tr-[var(--radius-xl)] rounded-br-[var(--radius-xl)] rounded-bl-[var(--radius-xl)] shadow-[var(--shadow-lg)]">
              <Image
                src="/images/hero-students.jpg"
                alt="Students studying together on a lawn in front of the National Parliament in Dhaka"
                width={1200}
                height={800}
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Question bank categories — the design's fixed five */}
      <section className="section-pad">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl space-y-3">
              <SectionDash />
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Our Question Bank Categories
              </h2>
              <p className="text-[var(--muted)]">
                Choose your target exam and start your preparation
              </p>
            </div>
            <Link href="/exams">
              <Button className="rounded-full px-6">
                View All Exams
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {CATEGORY_CARDS.map(({ name, sub, icon: Icon, match }) => (
              <li key={name}>
                <Link
                  href={categoryHref(match)}
                  className="group flex h-full flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-white px-5 py-8 text-center shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
                >
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e9f1fd] text-[var(--info)] transition-colors group-hover:bg-[var(--highlight-soft)] group-hover:text-[var(--highlight)]">
                    <Icon className="h-7 w-7" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-display text-lg leading-snug font-bold tracking-tight">
                      {name}
                    </span>
                    {sub ? (
                      <span className="mt-1 block text-sm text-[var(--muted)]">{sub}</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Topic base question analysis */}
      <section className="section-pad pt-0">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="rounded-[var(--radius-xl)] bg-[#e9f1fd] px-6 py-10 sm:px-10">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-xl space-y-3">
                <SectionDash />
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Topic Base Question Analysis
                </h2>
              </div>
              <Link href="/questions">
                <Button className="rounded-full px-6">
                  View All Topics
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
              {TOPIC_CARDS.map(({ name, icon: Icon, highlight, match }) => (
                <li key={name}>
                  <Link
                    href={topicHref(match)}
                    className={`group flex h-full flex-col items-center gap-3 rounded-[var(--radius-lg)] border bg-white px-5 py-8 text-center shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)] ${
                      highlight ? 'border-[var(--highlight)]' : 'border-[var(--line)]'
                    }`}
                  >
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#e9f1fd] text-[var(--info)] transition-colors group-hover:bg-[var(--highlight-soft)] group-hover:text-[var(--highlight)]">
                      <Icon className="h-7 w-7" aria-hidden />
                    </span>
                    <span className="font-display text-lg leading-snug font-bold tracking-tight">
                      {name}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Why choose + progress + CTA */}
      <section className="section-pad pt-0">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 lg:grid-cols-3">
          <div className="rounded-[var(--radius-xl)] bg-[#e9f1fd] p-7 shadow-[var(--shadow-sm)]">
            <SectionDash />
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
              Why Choose Your Academy?
            </h2>
            <ul className="mt-5 space-y-3">
              {WHY_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm font-medium text-[var(--ink-soft)]"
                >
                  <CheckCircle2
                    className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--info)]"
                    aria-hidden
                  />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-[var(--radius-xl)] border border-[var(--line)] bg-white p-7 shadow-[var(--shadow-sm)]">
            <h2 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
              <TrendingUp className="h-5 w-5 text-[var(--info)]" aria-hidden />
              Track Your Progress
            </h2>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              {[
                {
                  value: '750',
                  label: 'Total Attempted',
                  icon: CheckCircle2,
                  tone: 'text-[var(--info)] bg-[var(--info-soft)]',
                },
                {
                  value: '620',
                  label: 'Correct',
                  icon: CheckCircle2,
                  tone: 'text-[var(--success)] bg-[var(--success-soft)]',
                },
                {
                  value: '130',
                  label: 'Wrong',
                  icon: XCircle,
                  tone: 'text-[var(--danger)] bg-[var(--danger-soft)]',
                },
                {
                  value: '82.7%',
                  label: 'Accuracy',
                  icon: Percent,
                  tone: 'text-[#7c3aed] bg-[#f3e8ff]',
                },
              ].map(({ value, label, icon: Icon, tone }) => (
                <div
                  key={label}
                  className="space-y-1.5 rounded-[var(--radius)] border border-[var(--line)] px-2 py-3"
                >
                  <span
                    className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${tone}`}
                  >
                    <Icon className="h-4.5 w-4.5" aria-hidden />
                  </span>
                  <dd className="font-display text-lg leading-none font-bold">{value}</dd>
                  <dt className="text-[11px] leading-tight text-[var(--muted)]">{label}</dt>
                </div>
              ))}
            </dl>
            <svg
              viewBox="0 0 320 90"
              className="mt-5 w-full"
              role="img"
              aria-label="Accuracy trend rising over time"
            >
              <g stroke="var(--line)" strokeWidth="1">
                <line x1="0" y1="22" x2="320" y2="22" />
                <line x1="0" y1="47" x2="320" y2="47" />
                <line x1="0" y1="72" x2="320" y2="72" />
              </g>
              <polyline
                points="0,70 40,62 80,66 120,54 160,58 200,44 240,48 280,30 320,22"
                fill="none"
                stroke="var(--info)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {[
                [0, 70],
                [40, 62],
                [80, 66],
                [120, 54],
                [160, 58],
                [200, 44],
                [240, 48],
                [280, 30],
                [320, 22],
              ].map(([x, y]) => (
                <circle
                  key={`${x}-${y}`}
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill="#fff"
                  stroke="var(--info)"
                  strokeWidth="2"
                />
              ))}
            </svg>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-[var(--success-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--success)]">
              <TrendingUp className="h-3.5 w-3.5" aria-hidden />
              Your Performance is improving!
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--bg-inverse)] p-7 text-white shadow-[var(--shadow-sm)]">
            <Trophy
              aria-hidden
              className="absolute -right-6 -bottom-8 h-44 w-44 text-white/5"
              strokeWidth={1}
            />
            <div className="relative space-y-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Trophy className="h-6 w-6" aria-hidden />
              </span>
              <h2 className="font-display text-2xl leading-tight font-bold tracking-tight">
                Ace Your Next Job Exam!
              </h2>
              <p className="text-sm leading-relaxed text-white/70">
                Join thousands of successful candidates with Your Academy.
              </p>
              <Link href="/register">
                <Button className="rounded-full px-6">
                  Start Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sample MCQ */}
      <section className="section-pad pt-0">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl space-y-3">
              <SectionDash />
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Try a Sample MCQ
              </h2>
              <p className="text-[var(--muted)]">Test your knowledge with our free MCQ</p>
            </div>
            <Link href="/questions">
              <Button className="rounded-full px-6">
                Practice Now
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <SampleMcq />
        </div>
      </section>

      {/* Newsletter */}
      <section className="section-pad pt-0">
        <div className="mx-auto w-full max-w-7xl px-6">
          <NewsletterBar />
        </div>
      </section>
    </div>
  );
}
