import {
  BookOpen,
  FileText,
  Layers,
  Newspaper,
  Sparkles,
  Target,
} from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Layers,
    title: 'Extensive Question Bank',
    body: 'Practice BCS, Bank, Government Jobs, Primary, NTRCA, and more.',
  },
  {
    icon: Target,
    title: 'Topic-Based Analysis',
    body: 'Strengthen knowledge with subject-wise and topic-wise practice.',
  },
  {
    icon: BookOpen,
    title: 'Written Question Bank',
    body: 'Build written-exam confidence with structured written sets.',
  },
  {
    icon: Newspaper,
    title: 'Important Newspaper Columns',
    body: 'Stay current with curated columns and study PDFs.',
  },
  {
    icon: FileText,
    title: 'Study Materials & PDFs',
    body: 'Access organized educational resources in one place.',
  },
  {
    icon: Sparkles,
    title: 'Smart Learning Experience',
    body: 'Track preparation and practice more efficiently.',
  },
] as const;

/** Desktop promo rail + compact mobile strip for auth pages. */
export function AuthPromoPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'auth-promo relative flex flex-col overflow-hidden bg-[var(--bg-inverse)] text-white',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="auth-promo-grid absolute inset-0 opacity-[0.07]" />
        <div className="auth-orb-drift absolute -top-24 left-[12%] h-72 w-72 rounded-full bg-[color-mix(in_srgb,var(--highlight)_22%,transparent)] blur-3xl" />
        <div className="auth-orb-drift absolute right-[-10%] bottom-[-10%] h-80 w-80 rounded-full bg-[#1a4a8a]/45 blur-3xl [animation-delay:2.5s]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.08),transparent_55%)]" />
      </div>

      <div className="relative z-[1] flex h-full flex-col justify-between gap-8 p-8 xl:p-12">
        <BrandMark inverse priority className="shrink-0" />

        <div className="motion-stagger max-w-lg space-y-6">
          <div className="space-y-3">
            <p className="text-[0.6875rem] font-semibold tracking-[0.2em] text-white/55 uppercase">
              Your Academy
            </p>
            <h2 className="font-display text-3xl leading-tight font-bold tracking-tight xl:text-4xl">
              Your Journey to Exam Success Starts Here.
            </h2>
            <p className="text-base leading-relaxed text-white/70">
              Prepare smarter, practice consistently, and build the confidence to achieve your goals
              with Your Academy.
            </p>
          </div>

          <div className="inline-flex max-w-full items-center gap-2 rounded-2xl border border-[var(--highlight)]/35 bg-[var(--highlight)]/15 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--highlight)] text-sm font-bold shadow-sm">
              7
            </span>
            <div className="min-w-0">
              <p className="font-display text-sm font-bold tracking-tight">
                Enjoy 7 Days of Free Access!
              </p>
              <p className="text-xs leading-snug text-white/70">
                Explore practice features with full answers during your trial.
              </p>
            </div>
          </div>

          <ul className="grid gap-2.5 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="motion-hover-lift rounded-2xl border border-white/10 bg-white/5 p-3.5 backdrop-blur-sm"
              >
                <feature.icon
                  className="mb-2 size-5 text-[var(--highlight)]"
                  aria-hidden
                  strokeWidth={1.75}
                />
                <p className="font-display text-sm font-semibold tracking-tight">{feature.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/65">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">Your Academy · Learn · Practice · Succeed</p>
      </div>
    </aside>
  );
}

/** Compact trial callout for mobile auth forms. */
export function AuthMobileTrialBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'motion-rise rounded-2xl border border-[var(--highlight)]/25 bg-[linear-gradient(135deg,var(--highlight-soft),rgba(255,255,255,0.9))] p-4 shadow-[var(--shadow-sm)]',
        className,
      )}
    >
      <p className="font-display text-sm font-bold text-[var(--ink)]">
        Enjoy 7 Days of Free Access!
      </p>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted-strong)]">
        Prepare smarter with our question banks, topics, and study materials during your trial.
      </p>
    </div>
  );
}
