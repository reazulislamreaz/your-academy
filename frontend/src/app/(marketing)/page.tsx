import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Landmark,
  Percent,
  Settings,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
  Flag,
} from 'lucide-react';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { SampleMcq } from '@/components/marketing/sample-mcq';
import { NewsletterBar } from '@/components/marketing/newsletter-bar';

export const metadata: Metadata = {
  title: 'Your Academy — Job Exam Preparation',
  description:
    "Bangladesh's Premier Job Exam Preparation Platform. Practice MCQs for Govt. & Bank Jobs.",
};

const WHY_POINTS = [
  'Chapter-wise MCQ Practice',
  'Detailed Job Solutions',
  'Performance Analytics',
  'Regular Updates',
  '100% Free Access (Basic Plan)',
];

const CATEGORIES = [
  {
    name: 'BCS',
    subtitle: 'Preliminary + Written',
    href: '/questions?q=BCS',
    Icon: ShieldCheck,
    tone: 'bg-[#fff4e8] text-[#b45309]',
  },
  {
    name: 'Bank',
    subtitle: 'Officer & SO',
    href: '/questions?q=Bank',
    Icon: Landmark,
    tone: 'bg-[var(--info-soft)] text-[var(--info)]',
  },
  {
    name: 'Government Jobs',
    subtitle: 'All cadres & posts',
    href: '/questions?q=Government',
    Icon: Flag,
    tone: 'bg-[var(--highlight-soft)] text-[var(--highlight)]',
  },
  {
    name: 'Primary & NTRCA',
    subtitle: 'Teaching exams',
    href: '/questions?q=NTRCA',
    Icon: GraduationCap,
    tone: 'bg-[var(--info-soft)] text-[var(--info)]',
  },
  {
    name: 'Other Govt. Jobs',
    subtitle: 'More exams',
    href: '/questions',
    Icon: Settings,
    tone: 'bg-[var(--info-soft)] text-[var(--info)]',
  },
] as const;

export default function HomePage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[var(--bg-inverse)] text-white">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 px-6 py-14 lg:grid-cols-2 lg:gap-12 lg:py-20">
          <div className="motion-rise space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
              <GraduationCap className="h-4 w-4 text-white" aria-hidden />
              Bangladesh&apos;s Premier Job Exam Preparation Platform
            </p>
            <h1 className="font-display text-[clamp(2.6rem,5.5vw,4.1rem)] leading-[1.05] font-extrabold tracking-tight text-balance">
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
              <Link href="/questions">
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

          <div className="motion-rise relative" style={{ animationDelay: '90ms' }}>
            <div
              aria-hidden
              className="absolute -top-3 -right-3 bottom-6 left-6 rounded-tl-[9rem] rounded-tr-[var(--radius-xl)] rounded-br-[var(--radius-xl)] rounded-bl-[var(--radius-xl)] border-[3px] border-[var(--highlight)]"
            />
            <div className="relative overflow-hidden rounded-tl-[9rem] rounded-tr-[var(--radius-xl)] rounded-br-[var(--radius-xl)] rounded-bl-[var(--radius-xl)] shadow-[var(--shadow-lg)]">
              <Image
                src="/images/hero-students.jpg"
                alt="Students studying together outdoors"
                width={1200}
                height={800}
                priority
                className="aspect-[4/3] w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="section-pad">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl space-y-3">
              <p className="section-eyebrow">Categories</p>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Our Job Exam Categories
              </h2>
              <p className="text-[var(--muted)]">
                Choose your target exam and start your preparation
              </p>
            </div>
            <Link href="/questions">
              <Button className="rounded-full px-6">
                View All Exams
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {CATEGORIES.map(({ name, subtitle, href, Icon, tone }) => (
              <li key={name}>
                <Link
                  href={href}
                  className="group flex h-full flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-white px-5 py-8 text-center shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
                >
                  <span
                    className={`flex h-14 w-14 items-center justify-center rounded-2xl ${tone} transition-colors`}
                  >
                    <Icon className="h-7 w-7" aria-hidden />
                  </span>
                  <span>
                    <span className="block font-display text-lg leading-snug font-bold tracking-tight">
                      {name}
                    </span>
                    <span className="mt-1 block text-sm text-[var(--muted)]">{subtitle}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Why + Progress + CTA */}
      <section className="section-pad border-y border-[var(--line)] bg-[var(--bg-desk)]">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 lg:grid-cols-3">
          <div className="rounded-[var(--radius-xl)] bg-[#e9f1fd] p-7 shadow-[var(--shadow-sm)]">
            <p className="section-eyebrow">Why us</p>
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
                <div key={label} className="space-y-1.5">
                  <span className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full ${tone}`}>
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
              Your Performance is Improving!
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
      <section className="section-pad">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-xl space-y-3">
              <p className="section-eyebrow">Free sample</p>
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
