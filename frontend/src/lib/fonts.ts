import { Anek_Bangla, Anek_Latin } from 'next/font/google';

/**
 * Premium bilingual stack — Anek Latin + Anek Bangla (Ek Type / Google Fonts).
 * Designed as one multi-script family so Bn/En share visual DNA.
 * Loaded as variable fonts (efficient; avoids next/font static font-stretch parse issues).
 * CSS stack: Latin first, Bangla fallback — see `--font-stack` in globals.css (DEC-037).
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

/** Apply both CSS variables on <html>. */
export const fontVariableClassName = `${fontLatin.variable} ${fontBengali.variable}`;

/** @deprecated Prefer CSS stack; kept for older imports. */
export const fontPrimary = fontLatin;
export const fontSans = fontLatin;
export const fontDisplay = fontLatin;
export const fontReading = fontBengali;
export const fontLearner = fontLatin;
