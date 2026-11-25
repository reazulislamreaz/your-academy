import Link from 'next/link';
import { DEFAULT_FOOTER, type SocialLinkPublic } from '@your-academy/shared';
import { BrandMark } from './brand-mark';
import { FooterDeveloperCredit } from './footer-developer-credit';
import { FooterSocialLinks } from './footer-social-links';
import { marketingNavItems } from './marketing-nav';

type Props = {
  socialLinks: SocialLinkPublic[];
  /** DEC-069 — Admin → Page Headers & Footer (defaults = previous text). */
  content?: typeof DEFAULT_FOOTER;
};

const FAQ_PHRASE = 'Browse the FAQ';

/**
 * Presentational marketing footer. Kept free of data fetching so it can render
 * from a Server Component parent (`SiteFooter`) without entering the client bundle.
 */
export function SiteFooterView({ socialLinks, content = DEFAULT_FOOTER }: Props) {
  // Keep "Browse the FAQ" a link when the admin text still contains it.
  const [helpBefore, ...helpRest] = content.helpText.split(FAQ_PHRASE);
  const helpAfter = helpRest.join(FAQ_PHRASE);
  return (
    <footer id="contact" className="site-footer mt-auto shrink-0 text-white">
      <div aria-hidden className="site-footer-glow pointer-events-none absolute inset-0" />

      <div className="marketing-container relative py-10 sm:py-14 lg:py-16">
        <div className="grid gap-9 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-12 xl:gap-16">
          <div className="max-w-md space-y-5 sm:col-span-2 lg:col-span-1">
            <BrandMark inverse />
            <p className="text-sm leading-relaxed text-slate-300/90 sm:text-[0.9375rem]">
              {content.tagline}
            </p>
            <FooterSocialLinks links={socialLinks} />
          </div>

          <nav aria-label="Explore" className="min-w-0">
            <p className="site-footer-heading">Explore</p>
            <ul className="site-footer-link-list">
              {marketingNavItems.map((item) => (
                <li key={item.id}>
                  <Link href={item.href} className="site-footer-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Account" className="min-w-0">
            <p className="site-footer-heading">{content.accountHeading}</p>
            <ul className="site-footer-link-list">
              {content.accountLinks.map((item) => (
                <li key={`${item.href}-${item.label}`}>
                  <Link href={item.href} className="site-footer-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            {content.helpText ? (
              <p className="mt-5 max-w-xs text-xs leading-relaxed text-slate-400/95">
                {helpRest.length ? (
                  <>
                    {helpBefore}
                    <Link href="/#faq" className="site-footer-text-link">
                      {FAQ_PHRASE}
                    </Link>
                    {helpAfter}
                  </>
                ) : (
                  content.helpText
                )}
              </p>
            ) : null}
          </nav>
        </div>

        <div className="site-footer-meta mt-10 flex flex-col gap-3 pt-6 text-center sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:text-left">
          <p className="text-xs text-slate-400/90">{content.copyright}</p>
          <FooterDeveloperCredit />
        </div>
      </div>
    </footer>
  );
}
