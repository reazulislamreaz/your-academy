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
    <div className="rounded-[var(--radius-xl)] bg-[var(--bg-inverse)] px-6 py-6 text-white shadow-[var(--shadow)] sm:px-8">
      <div className="flex flex-col items-start gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <span aria-hidden className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10">
            <Send className="h-5 w-5 text-white" />
          </span>
          <div>
            <p className="font-display text-xl font-bold tracking-tight">Stay Updated!</p>
            <p className="mt-1 max-w-md text-sm leading-relaxed text-white/65">
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
          <form onSubmit={onSubmit} className="relative w-full max-w-md">
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
              className="h-12 w-full rounded-full border border-white/20 bg-white pr-32 pl-5 text-base text-[var(--ink)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--highlight)] focus:shadow-[0_0_0_3px_rgba(230,57,70,0.35)] sm:text-sm"
            />
            <Button
              type="submit"
              className="absolute top-1/2 right-1.5 h-9 -translate-y-1/2 rounded-full px-5"
            >
              Subscribe
            </Button>
          </form>
        )}
        <div className="flex items-center gap-2.5" aria-label="Follow us">
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
  );
}
