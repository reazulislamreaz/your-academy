import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Flag,
  GraduationCap,
  Landmark,
  Percent,
  Settings,
  ShieldCheck,
  TrendingUp,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductPreview } from '@/components/marketing/product-preview';
import { SampleMcq } from '@/components/marketing/sample-mcq';
import { NewsletterBar } from '@/components/marketing/newsletter-bar';
import { serverFetch } from '@/lib/api/client';
import type { CategoryNode, NewsListItem, PublicStats } from '@/lib/api/types';

function categoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes('bcs')) return ShieldCheck;
  if (n.includes('bank')) return Landmark;
  if (n.includes('government') || n.includes('govt')) return Flag;
  if (n.includes('primary') || n.includes('ntrca')) return GraduationCap;
  if (n.includes('other')) return Settings;
  return BookOpen;
}

const WHY_POINTS = [
  'Chapter-wise MCQ Practice',
  'Detailed Job Solutions',
  'Performance Analytics',
  'Regular Updates',
  '100% Free Access (Basic Plan)',
];

export default async function HomePage() {
  const [stats, categories, news] = await Promise.all([
    serverFetch<PublicStats>('/public/stats'),
    serverFetch<CategoryNode[]>('/categories'),
    serverFetch<NewsListItem[]>('/news'),
  ]);

  const roots = categories?.slice(0, 6) ?? [];
  const latestNews = news?.slice(0, 3) ?? [];

  return (
    <div>
      {/* Hero — navy panel, red accents, student photo */}
      <section className="relative overflow-hidden bg-[var(--bg-inverse)] text-white">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-20">
          <div className="motion-rise space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
              <GraduationCap className="h-4 w-4 text-white" aria-hidden />
              Bangladesh&apos;s Premier Job Exam Preparation Platform
            </p>
            <h1 className="font-display text-[clamp(2.75rem,6vw,4.25rem)] leading-[1.02] font-extrabold tracking-tight text-balance">
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
                alt="Students studying together on a lawn in front of the National Parliament in Dhaka"
                width={1200}
                height={800}
                priority
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Exam categories — live data, design styling */}
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
          {roots.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Categories will appear after seeding.</p>
          ) : (
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {roots.map((cat) => {
                const Icon = categoryIcon(cat.name);
                return (
                  <li key={cat.id}>
                    <Link
                      href={`/questions?categoryId=${cat.id}`}
                      className="group flex h-full flex-col items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-white px-5 py-8 text-center shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
                    >
                      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--info-soft)] text-[var(--info)] transition-colors group-hover:bg-[var(--highlight-soft)] group-hover:text-[var(--highlight)]">
                        <Icon className="h-7 w-7" aria-hidden />
                      </span>
                      <span>
                        <span className="block font-display text-lg leading-snug font-bold tracking-tight">
                          {cat.name}
                        </span>
                        <span className="mt-1 block text-sm text-[var(--muted)]">
                          {cat.description ?? `${cat.children.length} subtopics`}
                        </span>
                      </span>
                      {cat.children.length > 0 ? (
                        <span className="flex flex-wrap justify-center gap-1.5">
                          {cat.children.slice(0, 3).map((child) => (
                            <Badge key={child.id} variant="outline">
                              {child.name}
                            </Badge>
                          ))}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Why choose + progress + CTA */}
      <section className="section-pad border-y border-[var(--line)] bg-[var(--bg-desk)]">
        <div className="mx-auto grid w-full max-w-7xl gap-6 px-6 lg:grid-cols-3">
          <div className="rounded-[var(--radius-xl)] bg-[#e9f1fd] p-7 shadow-[var(--shadow-sm)]">
            <p className="section-eyebrow">Why us</p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-tight">
              Why Choose Your Academy?
            </h2>
            <ul className="mt-5 space-y-3">
              {WHY_POINTS.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-sm font-medium text-[var(--ink-soft)]">
                  <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[var(--info)]" aria-hidden />
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
            <dl className="mt-5 grid grid-cols-4 gap-3 text-center">
              {[
                { value: '750', label: 'Total Attempted', icon: CheckCircle2, tone: 'text-[var(--info)] bg-[var(--info-soft)]' },
                { value: '620', label: 'Correct', icon: CheckCircle2, tone: 'text-[var(--success)] bg-[var(--success-soft)]' },
                { value: '130', label: 'Wrong', icon: XCircle, tone: 'text-[var(--danger)] bg-[var(--danger-soft)]' },
                { value: '82.7%', label: 'Accuracy', icon: Percent, tone: 'text-[#7c3aed] bg-[#f3e8ff]' },
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
            <svg viewBox="0 0 320 90" className="mt-5 w-full" role="img" aria-label="Accuracy trend rising over time">
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
                <circle key={`${x}-${y}`} cx={x} cy={y} r="3.5" fill="#fff" stroke="var(--info)" strokeWidth="2" />
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

      {/* How the trial works */}
      <section id="how-trial-works" className="section-pad border-y border-[var(--line)] bg-[var(--bg-desk)]">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mb-10 max-w-xl space-y-3">
            <p className="section-eyebrow">Free trial</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              How the trial works
            </h2>
            <p className="text-[var(--muted)]">
              One fair week of full answers — then the library stays open without locking you out.
            </p>
          </div>
          <ol className="grid gap-5 sm:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Register with WhatsApp',
                body: 'Create an account in minutes. Your number is for login — not a public profile.',
              },
              {
                step: '02',
                title: 'Seven days unlocked',
                body: 'Practice MCQs with correct answers, indicators, and explanations included.',
              },
              {
                step: '03',
                title: 'Keep browsing after',
                body: 'Questions, options, PDFs, and news remain. Answer keys become premium.',
              },
            ].map((item, i) => (
              <li
                key={item.step}
                className="motion-rise space-y-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-sm)]"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <p className="font-display text-sm font-bold tracking-[0.16em] text-[var(--highlight)]">
                  {item.step}
                </p>
                <h3 className="font-display text-xl font-semibold tracking-tight">{item.title}</h3>
                <p className="text-sm leading-relaxed text-[var(--muted)]">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Inside a question */}
      <section className="section-pad bg-[var(--bg-inverse)] text-white">
        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-6 lg:grid-cols-2">
          <div className="motion-rise space-y-4">
            <p className="section-eyebrow">Product</p>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Inside a question
            </h2>
            <p className="max-w-md text-white/65">
              A calm practice desk: stem, options, check, then explanation when you are entitled —
              never fake locked theater.
            </p>
            <ul className="space-y-2 pt-2 text-sm text-white/75">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
                Category and difficulty filters
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
                Deterministic previous / next navigation
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
                Save questions and PDFs for later
              </li>
            </ul>
          </div>
          <div className="motion-rise" style={{ animationDelay: '80ms' }}>
            <ProductPreview />
          </div>
        </div>
      </section>

      {/* Latest news */}
      <section className="section-pad">
        <div className="mx-auto w-full max-w-7xl px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div className="space-y-3">
              <p className="section-eyebrow">News</p>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Latest news
              </h2>
              <p className="text-[var(--muted)]">Updates anyone can read — no login required.</p>
            </div>
            <Link
              href="/news"
              className="text-sm font-semibold text-[var(--highlight)] underline-offset-4 hover:underline"
            >
              All news
            </Link>
          </div>
          {latestNews.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No published articles yet.</p>
          ) : (
            <ul className="grid gap-5 md:grid-cols-3">
              {latestNews.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/news/${item.slug}`}
                    className="group flex h-full flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-white p-6 shadow-[var(--shadow-sm)] transition-all duration-[var(--duration-fast)] hover:-translate-y-0.5 hover:border-[var(--highlight)] hover:shadow-[var(--shadow)]"
                  >
                    <h3 className="font-display text-lg leading-snug font-semibold tracking-tight group-hover:text-[var(--highlight)]">
                      {item.title}
                    </h3>
                    {item.summary ? (
                      <p className="line-clamp-3 text-sm leading-relaxed text-[var(--muted)]">
                        {item.summary}
                      </p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-[var(--highlight)]">
                      Read article
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {stats ? (
        <section className="border-t border-[var(--line)] bg-[var(--bg-desk)]">
          <div className="mx-auto max-w-7xl px-6 py-14">
            <div className="max-w-2xl space-y-3">
              <p className="section-eyebrow">Live library</p>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                Built for fair practice
              </h2>
              <p className="text-[var(--muted)]">
                Live library size from this platform — not marketing placeholders. Answers are
                gated by the API after trial, so the UI never invents correctness.
              </p>
              <p className="text-sm font-medium text-[var(--ink-soft)]">
                {stats.questions} published questions · {stats.categories} categories ·{' '}
                {stats.documents} documents · {stats.news} news articles
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* Newsletter + closing CTA */}
      <section className="section-pad">
        <div className="mx-auto w-full max-w-7xl space-y-10 px-6">
          <NewsletterBar />
          <div className="relative overflow-hidden rounded-[var(--radius-xl)] bg-[var(--bg-inverse)] text-white">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-[var(--highlight)]/25 blur-3xl"
            />
            <div className="relative flex flex-col items-start gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-10">
              <div>
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                  Start your free week
                </h2>
                <p className="mt-3 max-w-lg text-white/65">
                  Register with WhatsApp, study with full explanations, then keep browsing for free.
                </p>
              </div>
              <Link href="/register">
                <Button size="lg" className="rounded-full px-7">
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
