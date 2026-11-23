import localFont from 'next/font/local';

/**
 * Platform typography (DEC-037):
 * - English / Latin UI: Inter
 * - Bengali (Unicode): Noto Sans Bengali — clear digits including ১
 *
 * SutonnyMJ is ANSI/Bijoy-only and cannot render Unicode Bengali on the web;
 * Noto Sans Bengali is the Unicode web standard that keeps Bn numerals readable.
 * Stack Latin → Bengali so browsers pick Inter for Latin and Noto for Bn code points.
 *
 * Self-hosted (DEC-049): `next/font/google` downloads fonts at build time and CI
 * builds start without a cache, so a malformed Google Fonts response failed the
 * production build. Files are the Google Fonts variable woff2 subsets (SIL OFL 1.1,
 * see `src/fonts/LICENSE.md`) — same faces, weights, and unicode ranges as before.
 */
export const fontLatin = localFont({
  src: '../fonts/inter-latin-wght.woff2',
  variable: '--font-latin',
  display: 'swap',
  // Variable axis limited to 400–700 (headings use 700; 800 unused).
  weight: '400 700',
  style: 'normal',
  preload: true,
  fallback: ['system-ui', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
  adjustFontFallback: 'Arial',
});

export const fontBengali = localFont({
  src: '../fonts/noto-sans-bengali-bengali-wght.woff2',
  variable: '--font-bengali',
  display: 'swap',
  weight: '100 900',
  style: 'normal',
  // Only fetched for Bengali code points; Latin text keeps using Inter.
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0951-0952, U+0964-0965, U+0980-09FE, U+1CD0, U+1CD2, U+1CD5-1CD6, U+1CD8, U+1CE1, U+1CEA, U+1CED, U+1CF2, U+1CF5-1CF7, U+200C-200D, U+20B9, U+25CC, U+A8F1, U+11DF0-11DF1',
    },
  ],
  preload: false,
  fallback: ['Noto Sans Bengali', 'Vrinda', 'Shonar Bangla', 'sans-serif'],
  adjustFontFallback: false,
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
