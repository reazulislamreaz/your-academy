import { Inter, Noto_Sans_Bengali } from 'next/font/google';

/**
 * Platform typography (DEC-037):
 * - English / Latin UI: Inter
 * - Bengali (Unicode): Noto Sans Bengali — clear digits including ১
 *
 * SutonnyMJ is ANSI/Bijoy-only and cannot render Unicode Bengali on the web;
 * Noto Sans Bengali is the Unicode web standard that keeps Bn numerals readable.
 * Stack Latin → Bengali so browsers pick Inter for Latin and Noto for Bn code points.
 */
export const fontLatin = Inter({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const fontBengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  variable: '--font-bengali',
  display: 'swap',
  weight: 'variable',
});

/** Same face as `fontBengali` — educational Q&A / serials use the Bengali stack. */
export const fontReading = fontBengali;

/** @deprecated Alias — site-wide stack is Inter + Noto (no separate marketing face). */
export const fontMarketingLatin = fontLatin;

/** Apply CSS variables on <html>. */
export const fontVariableClassName = `${fontLatin.variable} ${fontBengali.variable}`;

/** @deprecated Prefer role-specific exports / CSS stacks. */
export const fontPrimary = fontLatin;
export const fontSans = fontLatin;
export const fontDisplay = fontLatin;
export const fontLearner = fontLatin;
