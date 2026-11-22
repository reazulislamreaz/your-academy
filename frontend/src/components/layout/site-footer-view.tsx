import Link from 'next/link';
import type { SocialLinkPublic } from '@your-academy/shared';
import { BrandMark } from './brand-mark';
import { FooterDeveloperCredit } from './footer-developer-credit';
import { FooterSocialLinks } from './footer-social-links';
import { marketingNavItems } from './marketing-nav';

const ACCOUNT_LINKS = [
  { href: '/#faq', label: 'FAQ' },
  { href: '/register', label: 'Create free account' },
  { href: '/login', label: 'Sign in' },
] as const;

type Props = {
  socialLinks: SocialLinkPublic[];
};

/**
 * Presentational marketing footer. Kept free of data fetching so it can render
 * from a Server Component parent (`SiteFooter`) without entering the client bundle.
 */
export function SiteFooterView({ socialLinks }: Props) {
  return (
    <footer id="contact" className="site-footer mt-auto shrink-0 text-white">
      <div aria-hidden className="site-footer-glow pointer-events-none absolute inset-0" />

      <div className="marketing-container relative py-10 sm:py-14 lg:py-16">
        <div className="grid gap-9 sm:grid-cols-2 sm:gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-12 xl:gap-16">
          <div className="max-w-md space-y-5 sm:col-span-2 lg:col-span-1">
            <BrandMark inverse />
            <p className="text-sm leading-relaxed text-slate-300/90 sm:text-[0.9375rem]">
              Published Preli MCQs, Written question sets, and newspaper columns for serious exam
              prep.
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
            <p className="site-footer-heading">Account</p>
            <ul className="site-footer-link-list">
              {ACCOUNT_LINKS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="site-footer-link">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-5 max-w-xs text-xs leading-relaxed text-slate-400/95">
              Questions?{' '}
              <Link href="/#faq" className="site-footer-text-link">
                Browse the FAQ
              </Link>{' '}
              or create a free account to bookmark and practice.
            </p>
          </nav>
        </div>

        <div className="site-footer-meta mt-10 flex flex-col gap-3 pt-6 text-center sm:mt-12 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:text-left">
          <p className="text-xs text-slate-400/90">© 2026 Your Academy. All rights reserved.</p>
          <FooterDeveloperCredit />
        </div>
      </div>
    </footer>
  );
}
