'use client';

import { Lock } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { useMe } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

export const LOCKED_LABEL = 'Become a paid user to unlock';

/**
 * Where a click on locked content goes: the Packages page, or sign-in first (then back to
 * Packages) for visitors who are not logged in.
 */
export function useUnlockHref(): string {
  const me = useMe();
  if (me.data) return '/packages';
  return `/login?next=${encodeURIComponent('/packages')}`;
}

/** Inline "locked" marker for list cards (DEC-060). */
export function LockedTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted-strong)]',
        className,
      )}
    >
      <Lock className="size-3.5 shrink-0" aria-hidden />
      {LOCKED_LABEL}
    </span>
  );
}

/**
 * Full replacement for a locked set / test page. The API sent no questions, so there is
 * nothing to hide — this only explains why and links to Packages (or login).
 */
export function LockedContent({
  title,
  className,
}: {
  /** Name of the locked set / test, when known. */
  title?: string;
  className?: string;
}) {
  const me = useMe();
  const pathname = usePathname();
  const loggedIn = Boolean(me.data);
  return (
    <Surface
      role="status"
      className={cn(
        'motion-rise mx-auto max-w-xl space-y-4 p-6 text-center sm:p-8',
        className,
      )}
    >
      <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--bg-muted)] text-[var(--ink)]">
        <Lock className="size-6" aria-hidden />
      </span>
      {title ? (
        <p className="text-sm font-semibold break-words text-[var(--muted-strong)]">{title}</p>
      ) : null}
      <h2 className="font-display text-xl font-bold tracking-tight text-[var(--ink)]">
        {LOCKED_LABEL}
      </h2>
      <p className="text-sm leading-relaxed text-[var(--ink-soft)]">
        This content is part of the paid plan. Pick a package to unlock every set and model test.
      </p>
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {loggedIn ? (
          <Link href="/packages">
            <Button>See packages</Button>
          </Link>
        ) : (
          <>
            <Link href={`/login?next=${encodeURIComponent(pathname || '/packages')}`}>
              <Button>Log in</Button>
            </Link>
            <Link href="/packages">
              <Button variant="soft">See packages</Button>
            </Link>
          </>
        )}
      </div>
    </Surface>
  );
}
