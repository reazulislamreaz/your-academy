const PORTFOLIO_URL = 'https://reazul-islam-reaz.vercel.app';

/** Premium developer credit — portfolio opens in a new tab. */
export function FooterDeveloperCredit() {
  return (
    <p className="footer-dev-credit text-xs leading-relaxed text-slate-400/95 sm:text-[0.8125rem]">
      Designed &amp; Developed by{' '}
      <a
        href={PORTFOLIO_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="footer-dev-link cursor-pointer font-semibold text-white"
      >
        Reazul Islam Reaz
      </a>
    </p>
  );
}
