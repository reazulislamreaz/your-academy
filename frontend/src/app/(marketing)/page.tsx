import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProductPreview } from '@/components/marketing/product-preview';
import { serverFetch } from '@/lib/api/client';
import type { CategoryNode, NewsListItem, PublicStats } from '@/lib/api/types';

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
      {/* Hero — brand, one line, CTAs only in first viewport */}
      <section className="relative overflow-hidden border-b border-[var(--line)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[var(--bg-inverse)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.14]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-1/4 h-72 w-72 rounded-full bg-[var(--highlight)]/25 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg)] to-transparent"
        />

        <div className="relative mx-auto flex min-h-[78vh] w-full max-w-6xl flex-col justify-end px-6 pb-16 pt-24 sm:min-h-[72vh] sm:pb-20 sm:pt-28">
          <div className="motion-rise max-w-2xl space-y-6">
            <p className="font-display text-[clamp(3rem,10vw,5.5rem)] leading-[0.95] font-extrabold tracking-tight text-white">
              Your Academy
            </p>
            <p className="max-w-lg text-lg leading-relaxed text-white/70 sm:text-xl">
              Curated MCQs with a fair seven-day trial — keep browsing after; answers stay premium.
            </p>
            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/register">
                <Button size="lg">Start free trial</Button>
              </Link>
              <Link href="/questions">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/25 bg-white/5 text-white hover:border-white/50 hover:bg-white/10"
                >
                  Browse questions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {stats ? (
        <section className="border-b border-[var(--line)] bg-[var(--bg-elevated)]">
          <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-6 py-10 sm:grid-cols-4">
            <div className="motion-fade-in">
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Questions
              </p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight">{stats.questions}</p>
            </div>
            <div className="motion-fade-in" style={{ animationDelay: '40ms' }}>
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                Categories
              </p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight">{stats.categories}</p>
            </div>
            <div className="motion-fade-in" style={{ animationDelay: '80ms' }}>
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                News
              </p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight">{stats.news}</p>
            </div>
            <div className="motion-fade-in" style={{ animationDelay: '120ms' }}>
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--muted)] uppercase">
                PDFs
              </p>
              <p className="mt-1 font-display text-3xl font-bold tracking-tight">{stats.documents}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section id="how-trial-works" className="section-pad border-b border-[var(--line)]">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mb-10 max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              How the trial works
            </h2>
            <p className="mt-3 text-[var(--muted)]">
              One fair week of full answers — then the library stays open without locking you out.
            </p>
          </div>
          <ol className="grid gap-8 sm:grid-cols-3">
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
                className="motion-rise space-y-3"
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

      <section className="section-pad border-b border-[var(--line)] bg-[var(--bg-inverse)] text-white">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
          <div className="motion-rise space-y-4">
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

      <section className="section-pad border-b border-[var(--line)]">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mb-10 max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Categories</h2>
            <p className="mt-3 text-[var(--muted)]">
              Explore the question bank by topic. Sign in to open questions.
            </p>
          </div>
          {roots.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Categories will appear after seeding.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {roots.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={`/questions?categoryId=${cat.id}`}
                    className="group flex flex-col gap-3 py-6 transition-colors sm:flex-row sm:items-baseline sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <h3 className="font-display text-xl font-semibold tracking-tight text-[var(--ink)] group-hover:text-[var(--ink-soft)]">
                        {cat.name}
                      </h3>
                      <p className="text-sm text-[var(--muted)]">
                        {cat.description ?? `${cat.children.length} subtopics`}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:max-w-md sm:justify-end">
                      {cat.children.slice(0, 4).map((child) => (
                        <Badge key={child.id} variant="outline">
                          {child.name}
                        </Badge>
                      ))}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="section-pad border-b border-[var(--line)] bg-[var(--bg-elevated)]/70">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
                Latest news
              </h2>
              <p className="mt-3 text-[var(--muted)]">Updates anyone can read — no login required.</p>
            </div>
            <Link
              href="/news"
              className="text-sm font-semibold text-[var(--ink)] underline-offset-4 hover:underline"
            >
              All news
            </Link>
          </div>
          {latestNews.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No published articles yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {latestNews.map((item) => (
                <li key={item.id}>
                  <Link href={`/news/${item.slug}`} className="group block py-5">
                    <h3 className="font-display text-lg font-semibold tracking-tight group-hover:underline group-hover:underline-offset-4">
                      {item.title}
                    </h3>
                    {item.summary ? (
                      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                        {item.summary}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {stats ? (
        <section className="border-b border-[var(--line)]">
          <div className="mx-auto max-w-6xl px-6 py-14">
            <div className="max-w-2xl space-y-3">
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

      <section className="relative overflow-hidden bg-[var(--bg-inverse)] text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-16 top-0 h-48 w-48 rounded-full bg-[var(--highlight)]/20 blur-3xl"
        />
        <div className="relative mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-[var(--space-section)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Start your free week
            </h2>
            <p className="mt-3 max-w-lg text-white/65">
              Register with WhatsApp, study with full explanations, then keep browsing for free.
            </p>
          </div>
          <Link href="/register">
            <Button size="lg">Create account</Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
