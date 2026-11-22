import { Anek_Bangla, Anek_Latin, Hind_Siliguri, Plus_Jakarta_Sans } from 'next/font/google';

/**
 * UI chrome — Anek Latin + Anek Bangla (premium multi-script brand voice).
 * Variable load; CSS stack Latin → Bangla. See DEC-037.
 */
export const fontLatin = Anek_Latin({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
  weight: 'variable',
});

export const fontBengali = Anek_Bangla({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
  weight: 'variable',
});

/**
 * Educational reading — Hind Siliguri (simple Bn+Latin).
 * Used for MCQ stems, options, answers, explanations, and Bn serials (`.type-bn-serial`).
 * Never pair with `tabular-nums` / synthetic bold — those fragment digits ১/২/৩.
 * Also used under `.homepage-shell` for clear Bn digits (DEC-037).
 */
export const fontReading = Hind_Siliguri({
  subsets: ['latin', 'bengali'],
  variable: '--font-reading-face',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/**
 * Marketing homepage Latin face (DEC-037 homepage exception).
 * Scoped to `.homepage-shell` only — learner/admin stay on Anek.
 */
export const fontMarketingLatin = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-marketing-latin',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

/** Apply all CSS variables on <html>. */
export const fontVariableClassName = `${fontLatin.variable} ${fontBengali.variable} ${fontReading.variable} ${fontMarketingLatin.variable}`;

/** @deprecated Prefer role-specific exports / CSS stacks. */
export const fontPrimary = fontLatin;
export const fontSans = fontLatin;
export const fontDisplay = fontLatin;
export const fontLearner = fontLatin;
