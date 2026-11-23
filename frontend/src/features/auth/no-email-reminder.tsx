'use client';

import Link from 'next/link';
import { MailPlus, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useMe } from '@/features/auth/use-auth';

const DISMISS_KEY = 'ya:no-email-reminder-dismissed';

/**
 * Nudges learners without an email to add one, so they can reset a forgotten
 * password themselves. Dismissal is a per-browser convenience only.
 */
export function NoEmailReminder() {
  const me = useMe();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
  }, []);

  if (dismissed || !me.data || me.data.email) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Storage blocked: hide for this page view only.
    }
  };

  return (
    <div
      role="status"
      className="mx-4 mt-3 flex items-start gap-3 rounded-[var(--radius)] border border-[var(--info)]/35 bg-[var(--info-soft)] px-4 py-3 text-sm text-[var(--info-fg)] sm:mx-6"
    >
      <MailPlus className="mt-0.5 size-4 shrink-0" aria-hidden />
      <p className="min-w-0 flex-1 leading-relaxed">
        Add an email to your account so you can reset your password yourself if you ever forget it.{' '}
        <Link href="/profile" className="font-semibold underline underline-offset-2">
          Add email in Account Settings
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss reminder"
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-md hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-current"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
