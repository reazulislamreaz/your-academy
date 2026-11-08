import Link from 'next/link';
import { Send } from 'lucide-react';
import { FacebookIcon, LinkedinIcon, YoutubeIcon } from './social-icons';
import { BrandMark } from './brand-mark';

/**
 * Navy footer matching the homepage design: logo + tagline, centre links,
 * "Follow Us" icons, and the copyright line underneath.
 * Social icons are decorative until real profile URLs are supplied.
 * There is no /contact page yet, so Contact points at /about for now.
 */
export function SiteFooter() {
  const links = [
    { href: '/', label: 'Home' },
    { href: '/about', label: 'About' },
    { href: '/about', label: 'Contact' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms & Conditions' },
  ];

  return (
    <footer className="mt-auto bg-[var(--bg-inverse)] text-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-6 px-6 pt-10 pb-6 lg:flex-row lg:justify-between">
        <div className="space-y-2 text-center lg:text-left">
          <BrandMark inverse />
          <p className="text-sm font-medium text-white/70">Learn - Practice - Get Success</p>
        </div>
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-sm font-medium text-white/80"
        >
          {links.map((link, i) => (
            <span key={link.label} className="flex items-center gap-3">
              {i > 0 ? <span aria-hidden className="text-white/35">|</span> : null}
              <Link href={link.href} className="hover:text-white">
                {link.label}
              </Link>
            </span>
          ))}
        </nav>
        <div className="flex items-center gap-2.5">
          <span className="mr-1 text-sm font-medium text-white/80">Follow Us:</span>
          {[
            { label: 'Facebook', Icon: FacebookIcon },
            { label: 'YouTube', Icon: YoutubeIcon },
            { label: 'Telegram', Icon: Send },
            { label: 'LinkedIn', Icon: LinkedinIcon },
          ].map(({ label, Icon }) => (
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
      <p className="px-6 pb-6 text-center text-xs text-white/55">
        © 2025 Your Academy. All rights reserved.
      </p>
    </footer>
  );
}
