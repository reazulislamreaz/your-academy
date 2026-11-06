import Link from 'next/link';
import { Send } from 'lucide-react';
import { FacebookIcon, LinkedinIcon, YoutubeIcon } from './social-icons';
import { BrandMark } from './brand-mark';

/**
 * Navy footer. Social icons are decorative until real profile URLs are supplied.
 */
export function SiteFooter() {
  return (
    <footer className="mt-auto bg-[var(--bg-inverse)] text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4">
          <BrandMark inverse />
          <p className="text-sm font-semibold tracking-wide text-white/70">
            Learn • Practice • Get Success
          </p>
          <p className="max-w-sm text-sm leading-relaxed text-white/60">
            Curated MCQs, a fair seven-day trial, and study tools that stay useful after answers go
            premium.
          </p>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="text-xs font-semibold tracking-[0.14em] text-white/50 uppercase">Learn</p>
          <Link href="/questions" className="block text-white/75 hover:text-white">
            MCQ Practice
          </Link>
          <Link href="/exams" className="block text-white/75 hover:text-white">
            Model Tests
          </Link>
          <Link href="/documents" className="block text-white/75 hover:text-white">
            PDF library
          </Link>
          <Link href="/news" className="block text-white/75 hover:text-white">
            News
          </Link>
          <Link href="/about" className="block text-white/75 hover:text-white">
            About
          </Link>
        </div>
        <div className="space-y-2.5 text-sm">
          <p className="text-xs font-semibold tracking-[0.14em] text-white/50 uppercase">
            Account
          </p>
          <Link href="/login" className="block text-white/75 hover:text-white">
            Sign in
          </Link>
          <Link href="/register" className="block text-white/75 hover:text-white">
            Start trial
          </Link>
          <Link href="/faq" className="block text-white/75 hover:text-white">
            FAQ
          </Link>
          <Link href="/#how-trial-works" className="block text-white/75 hover:text-white">
            How it works
          </Link>
        </div>
        <div className="space-y-3 text-sm">
          <p className="text-xs font-semibold tracking-[0.14em] text-white/50 uppercase">
            Follow us
          </p>
          <div className="flex items-center gap-2.5">
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
          <p className="text-sm leading-relaxed text-white/60">
            Bangladesh&apos;s premier job exam preparation platform.
          </p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-2 px-6 py-4 text-xs text-white/55 sm:flex-row">
          <p>© {new Date().getFullYear()} Your Academy. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <span>Bangladesh&apos;s Premier Job Exam Preparation Platform</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
