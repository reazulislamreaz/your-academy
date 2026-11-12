import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  GraduationCap,
  Percent,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
  CheckCircle2,
} from 'lucide-react';
import type { Metadata } from 'next';
import { Button } from '@/components/ui/button';
import { HomepageLatestQuestions } from '@/components/marketing/homepage-latest-questions';
import { NewsletterBar } from '@/components/marketing/newsletter-bar';
import {
  BanglaBookIcon,
  BankTempleIcon,
  BcsEmblemIcon,
  EnglishLangIcon,
  GearBlueIcon,
  GkGlobeIcon,
  GovSealIcon,
  GradCapIcon,
  MathSymbolsIcon,
} from '@/components/marketing/homepage-icons';
import { Reveal } from '@/components/motion/reveal';

export const metadata: Metadata = {
  title: 'Your Academy — Job Exam Preparation',
  description:
    "Bangladesh's Premier Job Exam Preparation Platform. Practice MCQs for Govt. & Bank Jobs.",
};

const WHY_POINTS = [
  'Weekly Update Question Bank',
  'Chapter-wise MCQ Practice',
  'প্রতিদিন পত্রিকার গুরুত্বপূর্ণ কলাম',
  'Unlimited Exam Practice',
  'Regular Update',
  'Performance Update',
] as const;

const CATEGORIES = [
  {
    name: 'BCS',
    subtitle: '(Preliminary + Written)',
    href: '/preli-question-bank?q=BCS',
    Icon: BcsEmblemIcon,
  },
  {
    name: 'Bank',
    subtitle: '(Officer & SO)',
    href: '/preli-question-bank?examTag=bank',
    Icon: BankTempleIcon,
  },
  {
    name: 'Government Jobs',
    subtitle: '',
    href: '/preli-question-bank?examTag=govt-job',
    Icon: GovSealIcon,
  },
  {
    name: 'Primary & NTRCA',
    subtitle: '',
    href: '/preli-question-bank?examTag=ntrca',
    Icon: GradCapIcon,
  },
  {
    name: 'Other Govt. Jobs',
    subtitle: '',
    href: '/preli-question-bank',
    Icon: GearBlueIcon,
  },
] as const;

const TOPICS = [
  { name: 'Bangla', href: '/preli-question-bank?q=Bangla', Icon: BanglaBookIcon },
  { name: 'English', href: '/preli-question-bank?q=English', Icon: EnglishLangIcon },
  { name: 'Math', href: '/preli-question-bank?q=Math', Icon: MathSymbolsIcon },
  { name: 'GK', href: '/preli-question-bank?q=GK', Icon: GkGlobeIcon },
  { name: 'Others', href: '/preli-question-bank', Icon: GearBlueIcon },
] as const;

export default function HomePage() {
  return (
    <div className="bg-[var(--bg-desk)]">
      {/* Hero — full-bleed split with curved red accent */}
      <section className="relative overflow-hidden bg-[var(--bg-inverse)] text-white">
        <div className="relative mx-auto grid w-full max-w-[1280px] items-stretch lg:grid-cols-2">
          <div className="motion-rise relative z-10 space-y-6 px-4 py-12 sm:px-8 sm:py-14 lg:py-16 lg:pr-8 lg:pl-6 xl:pl-8">
            <p className="inline-flex items-center gap-2 rounded-full bg-[#5b6b80]/45 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
              <GraduationCap className="h-4 w-4 shrink-0 text-white" aria-hidden />
              Bangladesh&apos;s Premier Job Exam Preparation Platform
            </p>
            <h1 className="font-display text-[clamp(1.85rem,5vw,3.75rem)] leading-[1.08] font-extrabold tracking-tight text-balance">
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
                    d="M2 9 Q 30 2 60 7 Q 90 12 118 5"
                    stroke="var(--highlight)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className="max-w-md text-base leading-relaxed text-white/75 sm:text-lg">
              Practice MCQs, Get Expert Solutions, and Boost Your Preparation for Govt. &amp; Bank
              Jobs.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/register">
                <Button size="lg" className="rounded-full px-7 shadow-md">
                  Start Practicing
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/preli-question-bank">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/55 bg-transparent px-7 text-white hover:border-white hover:bg-white/10"
                >
                  Explore Question Bank
                </Button>
              </Link>
            </div>
            <dl className="flex flex-wrap items-center gap-x-0 gap-y-4 pt-4">
              {[
                { icon: Users, value: '1M+', label: 'Students' },
                { icon: BookOpen, value: '50+', label: 'Job Exams' },
                { icon: Trophy, value: '100%', label: 'Focused on Your Success' },
              ].map(({ icon: Icon, value, label }, i) => (
                <div key={label} className="flex items-center">
                  {i > 0 ? (
                    <span className="mx-4 hidden h-8 w-px bg-white/25 sm:block" aria-hidden />
                  ) : null}
                  <div className="flex items-center gap-3 pr-2 sm:pr-0">
                    <Icon className="h-6 w-6 text-white/85" aria-hidden />
                    <div>
                      <dt className="sr-only">{label}</dt>
                      <dd className="font-display text-lg leading-none font-bold sm:text-xl">
                        {value}
                      </dd>
                      <dd className="mt-1 text-xs text-white/85 sm:text-sm">{label}</dd>
                    </div>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div
            className="motion-rise relative min-h-[280px] sm:min-h-[360px] lg:min-h-full"
            style={{ animationDelay: '90ms' }}
          >
            <div className="hero-photo-mask absolute inset-0 overflow-hidden">
              <Image
                src="/images/hero-students.jpg"
                alt="Students studying together outdoors"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-[center_30%]"
              />
            </div>
            {/* Dual-tone curved divider (red + soft blue) — desktop only */}
            <svg
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 z-10 hidden h-full w-[4.5rem] -translate-x-1/2 lg:block"
              viewBox="0 0 72 640"
              preserveAspectRatio="none"
            >
              <path
                d="M40 0C12 130 8 250 34 360C56 450 54 540 36 640H22C40 540 42 450 20 360C-6 250-2 130 26 0H40Z"
                fill="var(--highlight)"
              />
              <path
                d="M52 0C24 130 20 250 46 360C68 450 66 540 48 640H40C58 540 60 450 38 360C12 250 16 130 44 0H52Z"
                fill="#a8d0f0"
              />
            </svg>
          </div>
        </div>
      </section>

      {/* Question bank categories — left intro + right cards */}
      <section className="section-pad">
        <Reveal className="mx-auto grid w-full max-w-[1280px] items-center gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
          <div className="space-y-4">
            <span
              className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
              aria-hidden
            />
            <h2 className="font-display text-2xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
              Our Question Bank Categories
            </h2>
            <p className="text-[var(--muted-strong)]">
              Choose your target exam and start your preparation
            </p>
            <Link href="/preli-question-bank" className="inline-flex pt-1">
              <Button className="rounded-full px-6 shadow-sm">
                View All Exams
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
            {CATEGORIES.map(({ name, subtitle, href, Icon }) => (
              <li key={name}>
                <Link
                  href={href}
                  className="group flex h-full flex-col items-center gap-2.5 rounded-[14px] border border-[var(--line)] bg-white px-2 py-5 text-center shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
                >
                  <Icon className="h-12 w-12" />
                  <span>
                    <span className="block font-display text-sm leading-snug font-bold tracking-tight text-[var(--ink)] sm:text-[15px]">
                      {name}
                    </span>
                    {subtitle ? (
                      <span className="mt-0.5 block text-xs leading-snug text-[var(--muted-strong)]">
                        {subtitle}
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      {/* Topic base question analysis */}
      <section className="pb-[var(--space-section)]">
        <Reveal className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
          <div className="rounded-[20px] bg-[#eaf1fb] px-5 py-7 sm:px-8 sm:py-8">
            <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,2.2fr)] lg:gap-10">
              <div className="space-y-4">
                <span
                  className="mb-1 block h-[3px] w-7 rounded-full bg-[var(--highlight)]"
                  aria-hidden
                />
                <h2 className="font-display text-3xl font-bold tracking-tight text-[var(--ink)] sm:text-[2rem]">
                  Topic Base Question Analysis
                </h2>
                <Link href="/preli-question-bank" className="inline-flex pt-1">
                  <Button className="rounded-full px-6 shadow-sm">
                    View All Topics
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              <ul className="motion-stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
                {TOPICS.map(({ name, href, Icon }) => (
                  <li key={name}>
                    <Link
                      href={href}
                      className="group flex h-full flex-col items-center gap-2.5 rounded-[14px] border border-[var(--line)] bg-white px-2 py-5 text-center shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
                    >
                      <Icon className="h-12 w-12" />
                      <span className="font-display text-sm font-bold tracking-tight text-[var(--ink)] sm:text-[15px]">
                        {name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Why + Progress + CTA */}
      <section id="how-it-works" className="scroll-mt-24 pb-[var(--space-section)]">
        <Reveal className="motion-stagger mx-auto grid w-full max-w-[1280px] gap-5 px-4 sm:px-6 lg:grid-cols-3 lg:gap-6">
          <div className="rounded-[18px] bg-[#e8f0fe] p-6 shadow-[var(--shadow-sm)] sm:p-7">
            <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
              Why Choose Your Academy?
            </h2>
            <ul className="mt-5 space-y-3.5">
              {WHY_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-2.5 text-sm font-medium text-[var(--ink-soft)]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--info)] text-white">
                    <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-white shadow-[var(--shadow-sm)]">
            <div className="flex items-center gap-2 bg-[#e8f0fe] px-5 py-3.5">
              <BarChart3 className="h-5 w-5 text-[var(--info)]" aria-hidden />
              <h2 className="font-display text-lg font-bold tracking-tight text-[var(--ink)] sm:text-xl">
                Track Your Progress
              </h2>
            </div>
            <div className="p-5 sm:p-6">
              <dl className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
                {[
                  {
                    value: '750',
                    label: 'Total Attempted',
                    icon: CheckCircle2,
                    tone: 'text-[var(--info)] bg-[var(--info-soft)]',
                    valueClass: 'text-[var(--ink)]',
                    labelClass: 'text-[var(--muted)]',
                  },
                  {
                    value: '620',
                    label: 'Correct',
                    icon: CheckCircle2,
                    tone: 'text-[var(--success)] bg-[var(--success-soft)]',
                    valueClass: 'text-[var(--success)]',
                    labelClass: 'text-[var(--success)]',
                  },
                  {
                    value: '130',
                    label: 'Wrong',
                    icon: XCircle,
                    tone: 'text-[var(--danger)] bg-[var(--danger-soft)]',
                    valueClass: 'text-[var(--danger)]',
                    labelClass: 'text-[var(--danger)]',
                  },
                  {
                    value: '82.7%',
                    label: 'Accuracy',
                    icon: Percent,
                    tone: 'text-[#7c3aed] bg-[#f3e8ff]',
                    valueClass: 'text-[#7c3aed]',
                    labelClass: 'text-[#7c3aed]',
                  },
                ].map(({ value, label, icon: Icon, tone, valueClass, labelClass }) => (
                  <div
                    key={label}
                    className="space-y-1 rounded-[12px] border border-[var(--line)] bg-[var(--bg-desk)] px-1.5 py-2.5"
                  >
                    <span
                      className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full ${tone}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <dd className={`font-display text-base leading-none font-bold ${valueClass}`}>
                      {value}
                    </dd>
                    <dt className={`text-xs leading-snug font-medium ${labelClass}`}>{label}</dt>
                  </div>
                ))}
              </dl>
              <div className="relative mt-4">
                <svg
                  viewBox="0 0 320 90"
                  className="w-full"
                  role="img"
                  aria-label="Accuracy trend rising over time"
                >
                  <g stroke="var(--line)" strokeWidth="1">
                    <line x1="0" y1="22" x2="320" y2="22" />
                    <line x1="0" y1="47" x2="320" y2="47" />
                    <line x1="0" y1="72" x2="320" y2="72" />
                    <line x1="80" y1="10" x2="80" y2="80" />
                    <line x1="160" y1="10" x2="160" y2="80" />
                    <line x1="240" y1="10" x2="240" y2="80" />
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
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[var(--success-soft)] px-2.5 py-1.5 text-xs font-semibold text-[var(--success-fg)] shadow-sm sm:absolute sm:right-0 sm:bottom-0 sm:mt-0">
                  <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                  Your Performance is improving!
                </p>
              </div>
            </div>
          </div>

          <div className="relative flex overflow-hidden rounded-[18px] bg-[var(--bg-inverse)] p-7 text-center text-white shadow-[var(--shadow-sm)]">
            <Trophy
              aria-hidden
              className="absolute -right-4 -bottom-6 h-40 w-40 text-white/5"
              strokeWidth={1}
            />
            <div className="relative m-auto flex max-w-[16rem] flex-col items-center space-y-4">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
                <Trophy className="h-7 w-7" aria-hidden />
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
        </Reveal>
      </section>

      <HomepageLatestQuestions limit={6} />

      {/* Newsletter */}
      <section className="pb-[var(--space-section)]">
        <Reveal className="mx-auto w-full max-w-[1280px] px-4 sm:px-6">
          <NewsletterBar />
        </Reveal>
      </section>
    </div>
  );
}
