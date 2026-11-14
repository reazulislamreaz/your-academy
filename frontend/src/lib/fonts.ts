import { Hind_Siliguri } from 'next/font/google';

/**
 * Primary bilingual UI font — Hind Siliguri (Bengali + Latin).
 * One family for marketing, auth, admin, learner shell, and educational reading
 * so mixed Bn/En strings stay visually consistent.
 */
export const fontPrimary = Hind_Siliguri({
  subsets: ['latin', 'bengali'],
  variable: '--font-primary',
  display: 'swap',
  weight: ['300', '400', '500', '600', '700'],
});

/** Back-compat aliases — all map to the same next/font instance. */
export const fontSans = fontPrimary;
export const fontDisplay = fontPrimary;
export const fontReading = fontPrimary;
export const fontLearner = fontPrimary;
