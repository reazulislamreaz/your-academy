import { BookOpen, Check, Layers, ListChecks, Target, TrendingUp } from 'lucide-react';
import { BrandMark } from '@/components/layout/brand-mark';
import { cn } from '@/lib/utils';

const FEATURES = [
  { icon: Layers, title: 'Extensive Question Bank', body: 'BCS, Bank, Govt & more.' },
  { icon: Target, title: 'Topic-Based Practice', body: 'Subject-wise mastery.' },
  { icon: BookOpen, title: 'Written Exam Prep', body: 'Written sets, ready to use.' },
  { icon: ListChecks, title: 'Smart Study Resources', body: 'PDFs, columns & tracking.' },
] as const;

const MCQ_OPTIONS = ['নদী', 'তরু', 'আকাশ', 'পাহাড়'] as const;
const MCQ_CORRECT = 1;
const OPTION_LABELS = ['ক', 'খ', 'গ', 'ঘ'] as const;
const BAR_HEIGHTS = [38, 52, 46, 64, 72, 86] as const;

/**
 * Desktop promo rail for login / register.
 *
 * Pure CSS + inline SVG (no image, no client JS): a slow navy mesh background and a
 * "live exam" vignette — an MCQ whose correct option gets ticked and a score card whose
 * chart draws itself. Only transform / opacity animate; `prefers-reduced-motion`
 * shows the finished, static state. Hidden below `lg`, so phones never pay for it.
 */
export function AuthPromoPanel({ className }: { className?: string }) {
  return (
    <aside
      className={cn(
        'auth-promo relative flex h-full min-h-0 flex-col overflow-hidden text-white',
        className,
      )}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="auth-mesh-orb auth-mesh-orb--blue -top-[18%] -left-[12%] size-[34rem]" />
        <div className="auth-mesh-orb auth-mesh-orb--red top-[38%] -right-[16%] size-[30rem]" />
        <div className="auth-mesh-orb auth-mesh-orb--violet -bottom-[22%] left-[18%] size-[26rem]" />
        <div className="auth-dot-grid absolute inset-0" />
        <svg
          className="auth-glow-lines absolute inset-0 h-full w-full"
          viewBox="0 0 800 900"
          fill="none"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="authLineRed" x1="0" y1="0" x2="1" y2="1">
              <stop stopColor="#ff5a5f" stopOpacity="0" />
              <stop offset="0.5" stopColor="#e31e24" stopOpacity="0.7" />
              <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="authLineBlue" x1="1" y1="0" x2="0" y2="1">
              <stop stopColor="#38bdf8" stopOpacity="0" />
              <stop offset="0.5" stopColor="#3b82f6" stopOpacity="0.6" />
              <stop offset="1" stopColor="#38bdf8" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path className="auth-glow-line" d="M-40 640C180 560 360 700 560 600C700 530 760 420 860 380" stroke="url(#authLineRed)" strokeWidth="1.5" />
          <path className="auth-glow-line auth-glow-line--late" d="M-40 760C200 700 380 800 600 700C720 646 790 560 860 520" stroke="url(#authLineBlue)" strokeWidth="1.25" />
        </svg>
        <div className="auth-promo-vignette absolute inset-0" />
      </div>

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col gap-8 px-8 py-8 xl:px-12 xl:py-10">
        <BrandMark inverse priority className="auth-promo-logo shrink-0 self-start [&_img]:h-11 xl:[&_img]:h-12" />

        <div className="grid min-h-0 flex-1 items-center gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(15rem,17rem)]">
          <div className="flex max-w-[25rem] flex-col gap-7">
            <div className="auth-promo-copy space-y-3.5">
              <p className="auth-promo-eyebrow inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1 text-[0.6875rem] font-semibold tracking-[0.14em] text-white/80 uppercase">
                <span className="size-1.5 rounded-full bg-[var(--highlight)] shadow-[0_0_8px_rgba(227,30,36,0.9)]" />
                BCS · Bank · Govt jobs
              </p>
              <h2 className="auth-promo-headline font-display text-[2.1rem] leading-[1.1] font-bold tracking-tight xl:text-[2.4rem]">
                <span className="whitespace-nowrap">
                  Prepare <span className="auth-promo-accent">Smarter</span>.
                </span>
                <br />
                Achieve More.
              </h2>
              <p className="auth-promo-sub max-w-[22rem] text-[0.9375rem] leading-relaxed text-white/80">
                Everything you need to succeed in competitive exams, all in one place.
              </p>
            </div>

            <ul className="auth-feature-grid grid grid-cols-2 gap-3">
              {FEATURES.map((feature) => (
                <li key={feature.title} className="auth-feature-card flex items-start gap-3 rounded-2xl p-3.5">
                  <span className="auth-feature-icon inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
                    <feature.icon className="size-4 text-white" aria-hidden strokeWidth={2.25} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-display text-[0.8125rem] leading-snug font-semibold text-white">{feature.title}</p>
                    <p className="mt-0.5 text-[0.72rem] leading-snug text-white/70">{feature.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <ExamVignette />
        </div>
      </div>
    </aside>
  );
}

/** Decorative "live exam" cards (xl+ only). */
function ExamVignette() {
  return (
    <div aria-hidden className="relative hidden h-[27rem] xl:block">
      <div className="auth-glass auth-float-a absolute top-0 right-0 left-0 rounded-2xl p-4">
        <div className="flex items-center justify-between text-[0.65rem] font-semibold tracking-wide text-white/60">
          <span>প্রশ্ন ১২ / ২৫</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/75">বাংলা ব্যাকরণ</span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="auth-quiz-progress h-full rounded-full bg-gradient-to-r from-[#ff5a5f] to-[var(--highlight)]" />
        </div>
        <p className="type-prose mt-3 text-[0.95rem] leading-snug font-medium text-white">‘বৃক্ষ’ শব্দের সমার্থক কোনটি?</p>
        <ul className="mt-3 space-y-1.5">
          {MCQ_OPTIONS.map((option, i) => (
            <li
              key={option}
              className={cn(
                'auth-mcq-option relative flex items-center gap-2.5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-2 text-[0.78rem] text-white/85',
                i === MCQ_CORRECT && 'auth-mcq-option--correct',
              )}
            >
              <span className="relative z-[1] grid size-5 shrink-0 place-items-center rounded-full border border-white/25 text-[0.62rem] font-semibold text-white/80">
                {OPTION_LABELS[i]}
              </span>
              <span className="type-prose relative z-[1] min-w-0 flex-1 truncate">{option}</span>
              {i === MCQ_CORRECT ? (
                <span className="auth-mcq-check relative z-[1] grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                  <Check className="size-3 text-white" strokeWidth={3} />
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <div className="auth-glass auth-float-b absolute -right-2 bottom-0 left-10 rounded-2xl p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[0.65rem] font-semibold tracking-wide text-white/60 uppercase">Mock test score</p>
            <p className="mt-0.5 font-display text-2xl font-bold text-white">
              86<span className="text-base text-white/70">%</span>
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-1 text-[0.65rem] font-semibold text-emerald-300">
            <TrendingUp className="size-3" strokeWidth={2.5} />
            +12
          </span>
        </div>
        <div className="relative mt-3 h-16">
          <div className="absolute inset-0 flex items-end gap-1.5">
            {BAR_HEIGHTS.map((h, i) => (
              <span
                key={i}
                className="auth-score-bar flex-1 rounded-t-md bg-gradient-to-t from-sky-500/25 to-sky-400/60"
                style={{ height: `${h}%`, animationDelay: `${0.25 + i * 0.12}s` }}
              />
            ))}
          </div>
          <svg className="absolute inset-0 h-full w-full overflow-visible" viewBox="0 0 120 64" preserveAspectRatio="none">
            <path
              className="auth-score-line"
              d="M4 44 L24 36 L44 40 L64 26 L84 20 L112 8"
              pathLength="1"
              fill="none"
              stroke="#ff5a5f"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
