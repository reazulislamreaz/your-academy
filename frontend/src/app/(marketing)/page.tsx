import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
      <section className="relative overflow-hidden">
        <div className="mx-auto grid w-full max-w-6xl gap-12 px-6 py-16 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-24">
          <div className="motion-rise space-y-7">
            <p className="text-xs font-semibold tracking-[0.18em] text-[var(--muted)] uppercase">
              MCQ practice for serious learners
            </p>
            <h1 className="font-display text-balance text-5xl leading-[1.05] font-extrabold tracking-tight text-[var(--ink)] sm:text-6xl">
              Your Academy
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-[var(--muted-strong)]">
              Study curated questions by category, unlock explanations during your seven-day trial,
              and keep browsing after — answers stay premium, the library stays open.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/register">
                <Button size="lg">Start free trial</Button>
              </Link>
              <Link href="/questions">
                <Button size="lg" variant="outline">
                  Browse questions
                </Button>
              </Link>
            </div>
            {stats ? (
              <dl className="flex flex-wrap gap-6 pt-2 text-sm">
                <div>
                  <dt className="text-[var(--muted)]">Published questions</dt>
                  <dd className="font-display text-2xl font-bold">{stats.questions}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">Categories</dt>
                  <dd className="font-display text-2xl font-bold">{stats.categories}</dd>
                </div>
                <div>
                  <dt className="text-[var(--muted)]">News</dt>
                  <dd className="font-display text-2xl font-bold">{stats.news}</dd>
                </div>
              </dl>
            ) : null}
          </div>

          <div
            className="motion-rise relative min-h-[280px] overflow-hidden rounded-[var(--radius-xl)] bg-[var(--bg-inverse)] p-8 text-white shadow-[var(--shadow-lg)] lg:min-h-[340px]"
            style={{ animationDelay: '80ms' }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute -right-8 -bottom-10 h-40 w-40 rounded-full bg-[var(--highlight)]/30 blur-2xl"
            />
            <p className="text-sm font-medium text-white/60">Seven-day trial includes</p>
            <ul className="mt-6 space-y-4 text-sm leading-relaxed">
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
                Full answers and written explanations
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
                Category and difficulty filters
              </li>
              <li className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--highlight)]" />
                Bookmarks, news, and study PDFs
              </li>
            </ul>
            <p className="mt-10 text-xs text-white/45">
              After trial: keep practicing — correct answers and explanations require an active trial
              or premium plan.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--bg-elevated)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="mb-8 max-w-xl">
            <h2 className="font-display text-3xl font-bold tracking-tight">Categories</h2>
            <p className="mt-2 text-[var(--muted)]">
              Explore the question bank by topic. Sign in to open questions (DEC-003).
            </p>
          </div>
          {roots.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Categories will appear after seeding.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {roots.map((cat) => (
                <Link
                  key={cat.id}
                  href={`/questions?categoryId=${cat.id}`}
                  className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg)] p-5 transition-shadow hover:shadow-[var(--shadow)]"
                >
                  <h3 className="font-semibold text-[var(--ink)]">{cat.name}</h3>
                  {cat.description ? (
                    <p className="mt-2 text-sm text-[var(--muted)]">{cat.description}</p>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      {cat.children.length} subtopics
                    </p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {cat.children.slice(0, 4).map((child) => (
                      <Badge key={child.id} variant="outline">
                        {child.name}
                      </Badge>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-[var(--line)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-bold tracking-tight">Latest news</h2>
              <p className="mt-2 text-[var(--muted)]">Updates anyone can read — no login required.</p>
            </div>
            <Link href="/news" className="text-sm font-semibold text-[var(--ink)] underline-offset-2 hover:underline">
              All news
            </Link>
          </div>
          {latestNews.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No published articles yet.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              {latestNews.map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.slug}`}
                  className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-[var(--bg-elevated)] p-5 shadow-[var(--shadow-sm)]"
                >
                  <h3 className="font-semibold">{item.title}</h3>
                  {item.summary ? (
                    <p className="mt-2 line-clamp-3 text-sm text-[var(--muted)]">{item.summary}</p>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-[var(--line)] bg-[var(--bg-inverse)] text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-6 py-16 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold">Start your free week</h2>
            <p className="mt-2 max-w-lg text-white/65">
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
