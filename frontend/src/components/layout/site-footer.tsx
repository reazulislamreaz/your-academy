import Link from 'next/link';
import { BrandMark } from './brand-mark';
import { FooterDeveloperCredit } from './footer-developer-credit';
import { FooterSocialLinks } from './footer-social-links';
import { marketingNavItems } from './marketing-nav';

/**
 * Classy marketing footer with navbar-inspired glass chrome —
 * brand, primary links, social icons, light contact cue, copyright.
 */
export function SiteFooter() {
  return (
    <footer id="contact" className="site-footer mt-auto text-white">
      <div aria-hidden className="site-footer-glow pointer-events-none absolute inset-0" />

      <div className="marketing-container relative px-4 py-10 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
          <div className="max-w-sm space-y-3">
            <BrandMark inverse />
            <p className="text-sm leading-relaxed text-slate-300/85">
              Published Preli MCQs, newspaper columns, and a 7-day free trial for serious exam prep.
            </p>
            <p className="text-xs text-slate-400">
              Questions?{' '}
              <Link href="/#faq" className="site-footer-text-link">
                Browse the FAQ
              </Link>
              {' · '}
              <Link href="/register" className="site-footer-text-link">
                Start free trial
              </Link>
            </p>
            <FooterSocialLinks />
          </div>

          <nav className="site-footer-rail" aria-label="Footer">
            {marketingNavItems.map((item) => (
              <Link key={item.id} href={item.href} className="site-footer-link">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="site-footer-meta mt-9 pt-5 text-center sm:mt-10 sm:flex sm:items-center sm:justify-between sm:text-left">
          <p className="text-xs text-slate-400/90">© 2026 Your Academy. All rights reserved.</p>
          <div className="mt-2 sm:mt-0">
            <FooterDeveloperCredit />
          </div>
        </div>
      </div>
    </footer>
  );
}
