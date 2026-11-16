import { BookOpen, Layers, Sparkles, Target } from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Layers,
    title: 'Extensive Question Bank',
    body: 'BCS, Bank, Govt & more.',
  },
  {
    icon: Target,
    title: 'Topic-Based Practice',
    body: 'Subject-wise mastery.',
  },
  {
    icon: BookOpen,
    title: 'Written Exam Prep',
    body: 'Written sets, ready to use.',
  },
  {
    icon: Sparkles,
    title: 'Smart Study Resources',
    body: 'PDFs, columns & tracking.',
  },
] as const;

/** Desktop promo rail — compact, viewport-friendly. */
export function AuthPromoPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'auth-promo relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--bg-inverse)] text-white',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="auth-promo-grid absolute inset-0 opacity-[0.07]" />
        <div className="auth-orb-drift absolute -top-20 left-[10%] h-56 w-56 rounded-full bg-[color-mix(in_srgb,var(--highlight)_24%,transparent)] blur-3xl" />
        <div className="auth-orb-drift absolute right-[-12%] bottom-[-8%] h-64 w-64 rounded-full bg-[#1a4a8a]/50 blur-3xl [animation-delay:2.5s]" />
        <div className="auth-promo-sheen absolute inset-0" />
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-center gap-5 px-8 py-8 xl:gap-6 xl:px-11 xl:py-10">
        <BrandMark inverse priority className="shrink-0 self-start" />

        <div className="motion-stagger max-w-md space-y-4" style={{ ['--stagger-step' as string]: '55ms' }}>
          <div className="space-y-2">
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-white/50 uppercase">
              Your Academy
            </p>
            <h2 className="font-display text-[1.75rem] leading-[1.15] font-bold tracking-tight xl:text-[2.125rem]">
              Prepare Smarter. Achieve More.
            </h2>
            <p className="text-sm leading-snug text-white/68 xl:text-[0.9375rem]">
              Everything you need to succeed in competitive exams, all in one place.
            </p>
          </div>

          <div className="inline-flex items-center gap-2.5 rounded-xl border border-[var(--highlight)]/40 bg-[var(--highlight)]/15 px-3 py-2 backdrop-blur-md">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--highlight)] text-xs font-bold shadow-sm">
              7
            </span>
            <p className="font-display text-sm font-bold tracking-tight">Days Free Access</p>
          </div>

          <ul className="grid grid-cols-2 gap-2">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="auth-feature-card rounded-xl border border-white/10 bg-white/[0.06] p-3 backdrop-blur-sm"
              >
                <feature.icon
                  className="mb-1.5 size-4 text-[var(--highlight)]"
                  aria-hidden
                  strokeWidth={1.75}
                />
                <p className="font-display text-[0.8125rem] leading-snug font-semibold tracking-tight">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-[0.6875rem] leading-snug text-white/60">{feature.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}

/** Compact trial chip for mobile auth forms. */
export function AuthMobileTrialBanner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'motion-rise flex items-center gap-2.5 rounded-xl border border-[var(--highlight)]/20 bg-[var(--highlight-soft)] px-3 py-2.5',
        className,
      )}
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--highlight)] text-[0.6875rem] font-bold text-white">
        7
      </span>
      <p className="text-xs font-semibold text-[var(--ink)]">Days free access · full answers in trial</p>
    </div>
  );
}
