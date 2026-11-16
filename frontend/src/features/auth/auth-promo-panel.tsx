import Image from 'next/image';
import {
  BarChart3,
  BookOpen,
  CheckSquare,
  Layers,
  ListChecks,
  Target,
} from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { cn } from '@/lib/utils';

const FEATURES = [
  {
    icon: Layers,
    title: 'Extensive Question Bank',
    body: 'BCS, Bank, Govt & more.',
    glow: 'cyan' as const,
  },
  {
    icon: Target,
    title: 'Topic-Based Practice',
    body: 'Subject-wise mastery.',
    glow: 'pink' as const,
  },
  {
    icon: BookOpen,
    title: 'Written Exam Prep',
    body: 'Written sets, ready to use.',
    glow: 'pink' as const,
  },
  {
    icon: ListChecks,
    title: 'Smart Study Resources',
    body: 'PDFs, columns & tracking.',
    glow: 'cyan' as const,
  },
] as const;

/** Desktop promo rail — reference split-screen hero. */
export function AuthPromoPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'auth-promo relative flex h-full min-h-0 flex-col overflow-hidden bg-[#04122e] text-white',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Student photo — right-weighted cover over navy base */}
        <div className="auth-promo-photo-wrap absolute inset-0">
          <Image
            src="/images/auth-student-hero.jpg"
            alt=""
            fill
            priority
            quality={92}
            sizes="(min-width: 1024px) 55vw, 0px"
            className="auth-promo-photo object-cover object-[78%_18%]"
          />
        </div>

        <div className="auth-promo-overlay absolute inset-0" />

        {/* Neon arcs */}
        <svg
          className="auth-neon-arc absolute inset-0 h-full w-full opacity-80"
          viewBox="0 0 800 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M420 80C560 140 650 280 680 420C710 560 680 720 560 820"
            stroke="url(#authNeonPink)"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="auth-neon-path auth-neon-path--pink"
          />
          <path
            d="M380 120C520 160 620 300 640 450C660 600 620 740 500 820"
            stroke="url(#authNeonBlue)"
            strokeWidth="2"
            strokeLinecap="round"
            className="auth-neon-path auth-neon-path--blue"
          />
          <defs>
            <linearGradient id="authNeonPink" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#ff4d6d" stopOpacity="0.05" />
              <stop offset="0.45" stopColor="#e31e24" stopOpacity="0.85" />
              <stop offset="1" stopColor="#7c3aed" stopOpacity="0.15" />
            </linearGradient>
            <linearGradient id="authNeonBlue" x1="1" y1="0" x2="0" y2="1">
              <stop stopColor="#38bdf8" stopOpacity="0.1" />
              <stop offset="0.5" stopColor="#3b82f6" stopOpacity="0.75" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>

        {/* Floating icons */}
        <div className="auth-float-icon auth-float-icon--chart absolute top-[22%] right-[18%] flex size-12 items-center justify-center rounded-xl bg-[#0b1f4a]/80 shadow-[0_0_24px_rgba(59,130,246,0.55)] ring-1 ring-sky-400/60 backdrop-blur-md xl:size-14">
          <BarChart3 className="size-6 text-sky-300" strokeWidth={2} />
        </div>
        <div className="auth-float-icon auth-float-icon--check absolute bottom-[18%] left-[42%] flex size-11 items-center justify-center rounded-xl bg-[#0b1f4a]/80 shadow-[0_0_22px_rgba(59,130,246,0.45)] ring-1 ring-sky-400/50 backdrop-blur-md">
          <CheckSquare className="size-5 text-sky-300" strokeWidth={2} />
        </div>

        <div className="auth-orb-drift absolute -top-24 left-[-8%] h-64 w-64 rounded-full bg-[color-mix(in_srgb,var(--highlight)_22%,transparent)] blur-3xl" />
        <div className="auth-orb-drift absolute right-[-10%] bottom-[-12%] h-72 w-72 rounded-full bg-sky-600/25 blur-3xl [animation-delay:2.2s]" />
        <div className="auth-promo-sheen absolute inset-0" />
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col justify-between gap-6 px-8 py-8 xl:px-10 xl:py-9">
        <BrandMark
          inverse
          priority
          className="auth-promo-logo shrink-0 self-start hover:opacity-100 [&_img]:h-11 xl:[&_img]:h-12"
        />

        <div className="flex max-w-[22.5rem] flex-1 flex-col justify-center gap-6 xl:max-w-[24rem]">
          <div className="auth-promo-copy space-y-3">
            <h2 className="auth-promo-headline font-display text-[2rem] leading-[1.12] font-bold tracking-tight text-white xl:text-[2.35rem]">
              Prepare <span className="auth-promo-accent">Smarter</span>.
              <br />
              Achieve More.
            </h2>
            <p className="auth-promo-sub max-w-[20rem] text-[0.9375rem] leading-relaxed font-medium text-white/90">
              Everything you need to succeed in competitive exams, all in one place.
            </p>
          </div>

          <ul className="auth-feature-grid grid grid-cols-2 gap-2.5 xl:gap-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.title}
                className={cn(
                  'auth-feature-card flex items-start gap-2.5 rounded-2xl border bg-white/[0.08] p-3 backdrop-blur-md xl:p-3.5',
                  feature.glow === 'cyan'
                    ? 'auth-feature-card--cyan border-sky-400/35'
                    : 'auth-feature-card--pink border-[color-mix(in_srgb,var(--highlight)_45%,white)]',
                )}
              >
                <span className="auth-feature-icon inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--highlight)] shadow-[0_0_14px_rgba(227,30,36,0.45)]">
                  <feature.icon className="size-3.5 text-white" aria-hidden strokeWidth={2.25} />
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="font-display text-[0.78rem] leading-snug font-semibold tracking-tight text-white xl:text-[0.8125rem]">
                    {feature.title}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] leading-snug text-white/80">{feature.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="h-2 shrink-0" aria-hidden />
      </div>
    </aside>
  );
}
