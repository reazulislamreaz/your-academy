import { Manrope, Source_Serif_4, Syne } from 'next/font/google';

/** Brand / display — geometric, not Inter/Roboto/system. */
export const fontDisplay = Syne({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
  weight: ['600', '700', '800'],
});

/** UI / body — readable at dense app density. */
export const fontSans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
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
