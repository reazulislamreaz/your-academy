'use client';

import { Reveal } from '@/components/motion/reveal';

const PORTFOLIO_URL = 'https://reazul-islam-reaz.vercel.app';

/** Premium developer credit — portfolio opens in a new tab. */
export function FooterDeveloperCredit() {
  return (
    <Reveal className="mt-3">
      <p className="text-xs leading-relaxed text-white/50 sm:text-[0.8125rem]">
        Designed &amp; Developed by{' '}
        <a
          href={PORTFOLIO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="footer-dev-link cursor-pointer font-semibold text-white/85"
        >
          Reazul Islam Reaz
        </a>
      </p>
    </Reveal>
  );
}
