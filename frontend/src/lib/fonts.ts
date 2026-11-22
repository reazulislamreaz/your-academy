import { Hind_Siliguri, Inter } from 'next/font/google';

/**
 * Platform typography (DEC-037):
 * - English / Latin UI: Inter (`--font-inter`)
 * - Bengali (Unicode): Hind Siliguri (`--font-bangla`)
 * - Fallback: Noto Sans Bengali (stack string only — not loaded separately)
 *
 * SutonnyMJ is ANSI/Bijoy-only and cannot render Unicode Bengali on the web.
 * Stack Latin → Bangla so browsers pick Inter for Latin and Hind for Bn code points.
 * Reading / Q&A stack prefers Bangla first.
 */
export const fontInter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const fontBangla = Hind_Siliguri({
  subsets: ['bengali', 'latin'],
  variable: '--font-bangla',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/** @deprecated Prefer `fontInter` / `--font-inter`. */
export const fontLatin = fontInter;

/** @deprecated Prefer `fontBangla` / `--font-bangla`. */
export const fontBengali = fontBangla;

/** Same face as Bangla — educational Q&A / serials use the reading stack. */
export const fontReading = fontBangla;

/** @deprecated Alias — site-wide stack is Inter + Hind Siliguri. */
export const fontMarketingLatin = fontInter;

/** Apply CSS variables on <html>. */
export const fontVariableClassName = `${fontInter.variable} ${fontBangla.variable}`;

/** @deprecated Prefer role-specific exports / CSS stacks. */
export const fontPrimary = fontInter;
export const fontSans = fontInter;
export const fontDisplay = fontInter;
export const fontLearner = fontInter;
