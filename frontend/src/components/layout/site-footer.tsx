import Link from 'next/link';
import { Send } from 'lucide-react';
import { FacebookIcon, LinkedinIcon, YoutubeIcon } from './social-icons';
import { BrandMark } from './brand-mark';

const FOOTER_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#about', label: 'About' },
  { href: '/#contact', label: 'Contact' },
  { href: '/#privacy', label: 'Privacy Policy' },
  { href: '/#terms', label: 'Terms & Conditions' },
] as const;

const SOCIAL = [
  { label: 'Facebook', Icon: FacebookIcon },
  { label: 'YouTube', Icon: YoutubeIcon },
  { label: 'Telegram', Icon: Send },
  { label: 'LinkedIn', Icon: LinkedinIcon },
] as const;

/**
 * Navy footer matching the homepage design reference.
 */
export function SiteFooter() {
  return (
    <footer id="contact" className="mt-auto bg-[var(--bg-inverse)] text-white">
      <div className="mx-auto w-full max-w-[1280px] px-6 py-10">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <BrandMark inverse />
            <p className="text-sm font-medium tracking-wide text-white/70">
              Learn - Practice - Get Success
            </p>
          </div>

          <nav
            className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm text-white/80"
            aria-label="Footer"
          >
            {FOOTER_LINKS.map((link, i) => (
              <span key={link.label} className="inline-flex items-center gap-3">
                {i > 0 ? (
                  <span className="hidden text-white/30 sm:inline" aria-hidden>
                    |
                  </span>
                ) : null}
                <Link href={link.href} className="hover:text-white">
                  {link.label}
                </Link>
              </span>
            ))}
          </nav>

          <div className="flex items-center gap-3 lg:justify-end">
            <p className="text-sm text-white/75">Follow Us:</p>
            <div className="flex items-center gap-2.5">
              {SOCIAL.map(({ label, Icon }) => (
                <span
                  key={label}
                  title={label}
                  aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[var(--bg-inverse)]"
                >
                  <Icon className="h-4 w-4" />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/15 pt-5 text-center">
          <p className="text-xs text-white/55">© 2025 Your Academy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
