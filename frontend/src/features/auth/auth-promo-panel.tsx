import Image from 'next/image';
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

/** Desktop promo rail — photo backdrop, glass cards, viewport-friendly. */
export function AuthPromoPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'auth-promo relative flex h-full min-h-0 flex-col overflow-hidden bg-[var(--bg-inverse)] text-white',
        className,
      )}
    >
      {/* Photo + atmospheric layers */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="auth-promo-photo-wrap absolute inset-0">
          <Image
            src="/images/auth-students.jpg"
            alt=""
            fill
            priority
            sizes="(min-width: 1024px) 52vw, 0px"
            className="auth-promo-photo object-cover object-[center_35%]"
          />
        </div>

        {/* Readability: deep navy wash + brand-tinted gradients */}
        <div className="auth-promo-overlay absolute inset-0" />
        <div className="auth-promo-grid absolute inset-0 opacity-[0.05]" />

        <div className="auth-orb-drift absolute -top-16 left-[6%] h-52 w-52 rounded-full bg-[color-mix(in_srgb,var(--highlight)_28%,transparent)] blur-3xl" />
        <div className="auth-orb-drift absolute right-[-10%] bottom-[-6%] h-60 w-60 rounded-full bg-[#1a4a8a]/55 blur-3xl [animation-delay:2.5s]" />
        <div className="auth-promo-spark auth-promo-spark--a absolute top-[18%] right-[14%] size-1.5 rounded-full bg-white/70" />
        <div className="auth-promo-spark auth-promo-spark--b absolute top-[42%] left-[10%] size-1 rounded-full bg-[var(--highlight)]/80" />
        <div className="auth-promo-spark auth-promo-spark--c absolute bottom-[28%] right-[22%] size-1.5 rounded-full bg-white/50" />
        <div className="auth-promo-sheen absolute inset-0" />
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-center gap-5 px-8 py-8 xl:gap-6 xl:px-11 xl:py-10">
        <BrandMark inverse priority className="shrink-0 self-start" />

        <div className="motion-stagger max-w-md space-y-4" style={{ ['--stagger-step' as string]: '60ms' }}>
          <div className="space-y-2">
            <p className="text-[0.65rem] font-semibold tracking-[0.18em] text-white/65 uppercase">
              Your Academy
            </p>
            <h2 className="font-display text-[1.75rem] leading-[1.15] font-bold tracking-tight drop-shadow-[0_2px_12px_rgba(0,16,40,0.45)] xl:text-[2.125rem]">
              Prepare Smarter. Achieve More.
            </h2>
            <p className="text-sm leading-snug text-white/78 xl:text-[0.9375rem]">
              Everything you need to succeed in competitive exams, all in one place.
            </p>
          </div>

          <div className="auth-trial-chip inline-flex items-center gap-2.5 rounded-xl border border-[var(--highlight)]/45 bg-[var(--highlight)]/20 px-3 py-2 shadow-[0_0_0_1px_rgba(227,30,36,0.12)] backdrop-blur-md">
            <span className="auth-trial-badge relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--highlight)] text-xs font-bold shadow-sm">
              <span aria-hidden className="auth-trial-ring" />
              7
            </span>
            <p className="font-display text-sm font-bold tracking-tight">Days Free Access</p>
          </div>

          <ul className="grid grid-cols-2 gap-2">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="auth-feature-card rounded-xl border border-white/14 bg-white/[0.08] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-md"
              >
                <feature.icon
                  className="mb-1.5 size-4 text-[var(--highlight)]"
                  aria-hidden
                  strokeWidth={1.75}
                />
                <p className="font-display text-[0.8125rem] leading-snug font-semibold tracking-tight">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-[0.6875rem] leading-snug text-white/68">{feature.body}</p>
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
