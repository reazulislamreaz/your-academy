'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { FacebookIcon, LinkedinIcon, YoutubeIcon } from '@/components/layout/social-icons';
import { Button } from '@/components/ui/button';

/**
 * Newsletter bar from the homepage design.
 * There is no newsletter backend yet, so signup says so honestly and points
 * at the free trial instead of pretending to subscribe.
 */
export function NewsletterBar() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setDone(true);
  };

  return (
    <div className="rounded-[18px] bg-[var(--bg-inverse)] px-5 py-5 text-white shadow-[var(--shadow)] sm:px-7 sm:py-6">
      <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-center gap-3.5">
          <span
            aria-hidden
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10"
          >
            <Send className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="font-display text-xl font-bold tracking-tight">Stay Updated!</p>
            <p className="mt-0.5 max-w-xs text-sm leading-relaxed text-white/65">
              Get the latest job circulars, exam updates and preparation tips.
            </p>
          </div>
        </div>
        {done ? (
          <p className="max-w-md text-sm leading-relaxed text-white/80" role="status">
            Newsletter signup isn&apos;t live yet —{' '}
            <Link href="/register" className="font-semibold text-white underline underline-offset-4">
              create a free account
            </Link>{' '}
            to stay updated.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="flex w-full max-w-md">
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="h-11 min-w-0 flex-1 rounded-l-full border border-white/15 border-r-0 bg-white px-4 text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:shadow-[0_0_0_3px_rgba(227,30,36,0.35)] sm:text-sm"
            />
            <Button type="submit" className="h-11 shrink-0 rounded-l-none rounded-r-full px-6">
              Subscribe
            </Button>
          </form>
        )}
        <div className="flex items-center gap-3" aria-label="Follow us">
          <span className="hidden h-8 w-px bg-white/25 lg:block" aria-hidden />
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
        </div>
      </div>
    </div>
  );
}
