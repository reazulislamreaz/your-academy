import { Inter, Manrope, Source_Serif_4, Syne } from 'next/font/google';

/** Brand / display — geometric, not Inter/Roboto/system (marketing + light shells). */
export const fontDisplay = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700', '800'],
});

/** UI / body — readable at dense app density (marketing + light shells). */
export const fontSans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/** Learner dark shell UI (Orbit-style) — scoped via `.learner-theme`. */
export const fontLearner = Inter({
  subsets: ['latin'],
  variable: '--font-learner',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/** Long-form MCQ / news reading. */
export const fontReading = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-reading',
  display: 'swap',
  weight: ['400', '600'],
});
