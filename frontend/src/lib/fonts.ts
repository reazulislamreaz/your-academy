import { Anek_Bangla, Anek_Latin, Hind_Siliguri } from 'next/font/google';

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
 * Used for MCQ stems, options, answers, explanations — prioritize long-form comfort
 * over decorative UI letterforms.
 */
export const fontReading = Hind_Siliguri({
  subsets: ['latin', 'bengali'],
  variable: '--font-reading-face',
  display: 'swap',
  weight: ['400', '500', '600'],
});

/** Apply all CSS variables on <html>. */
export const fontVariableClassName = `${fontLatin.variable} ${fontBengali.variable} ${fontReading.variable}`;

/** @deprecated Prefer role-specific exports / CSS stacks. */
export const fontPrimary = fontLatin;
export const fontSans = fontLatin;
export const fontDisplay = fontLatin;
export const fontLearner = fontLatin;
