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
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="auth-promo-photo-wrap absolute inset-0">
          <Image
            src="/images/auth-students.jpg"
            alt=""
            fill
            priority
            quality={90}
            sizes="(min-width: 1024px) 52vw, 0px"
            className="auth-promo-photo object-cover object-[center_32%]"
          />
        </div>

        <div className="auth-promo-overlay absolute inset-0" />
        <div className="auth-promo-grid absolute inset-0 opacity-[0.035]" />

        <div className="auth-orb-drift absolute -top-20 left-[4%] h-44 w-44 rounded-full bg-[color-mix(in_srgb,var(--highlight)_18%,transparent)] blur-3xl" />
        <div className="auth-orb-drift absolute right-[-14%] bottom-[-10%] h-52 w-52 rounded-full bg-[#1a4a8a]/35 blur-3xl [animation-delay:2.5s]" />
        <div className="auth-promo-spark auth-promo-spark--a absolute top-[16%] right-[12%] size-1.5 rounded-full bg-white/70" />
        <div className="auth-promo-spark auth-promo-spark--b absolute top-[48%] left-[8%] size-1 rounded-full bg-[var(--highlight)]/75" />
        <div className="auth-promo-spark auth-promo-spark--c absolute bottom-[24%] right-[20%] size-1.5 rounded-full bg-white/45" />
        <div className="auth-promo-sheen absolute inset-0" />
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-center gap-5 px-8 py-8 xl:gap-6 xl:px-11 xl:py-10">
        <BrandMark
          inverse
          priority
          className="auth-promo-logo shrink-0 self-start hover:opacity-100"
        />

        <div className="max-w-md space-y-4">
          <div className="auth-promo-copy space-y-2.5">
            <p className="auth-promo-eyebrow text-[0.65rem] font-semibold tracking-[0.2em] text-white/70 uppercase">
              Your Academy
            </p>
            <h2 className="auth-promo-headline font-display text-[1.8rem] leading-[1.12] font-bold tracking-tight xl:text-[2.2rem]">
              Prepare <span className="auth-promo-accent">Smarter</span>.
              <br className="hidden sm:block" /> Achieve{' '}
              <span className="auth-promo-accent">More</span>.
            </h2>
            <p className="auth-promo-sub max-w-sm text-sm leading-relaxed text-white/82 xl:text-[0.9375rem]">
              Everything you need to succeed in competitive exams, all in one place.
            </p>
          </div>

          <div className="auth-trial-chip inline-flex items-center gap-2.5 rounded-xl border border-[var(--highlight)]/45 bg-[var(--highlight)]/22 px-3 py-2 shadow-[0_0_0_1px_rgba(227,30,36,0.12)] backdrop-blur-md">
            <span className="auth-trial-badge relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--highlight)] text-xs font-bold shadow-sm">
              <span aria-hidden className="auth-trial-ring" />
              7
            </span>
            <p className="font-display text-sm font-bold tracking-tight">Days Free Access</p>
          </div>

          <ul className="auth-feature-grid grid grid-cols-2 gap-2.5">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className="auth-feature-card rounded-xl border border-white/16 bg-white/[0.1] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-[10px]"
              >
                <span className="auth-feature-icon mb-2 inline-flex size-7 items-center justify-center rounded-lg bg-[var(--highlight)]/18 ring-1 ring-[var(--highlight)]/30">
                  <feature.icon
                    className="size-3.5 text-[var(--highlight)]"
                    aria-hidden
                    strokeWidth={2}
                  />
                </span>
                <p className="font-display text-[0.8125rem] leading-snug font-semibold tracking-tight text-white">
                  {feature.title}
                </p>
                <p className="mt-0.5 text-[0.6875rem] leading-snug text-white/72">{feature.body}</p>
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
