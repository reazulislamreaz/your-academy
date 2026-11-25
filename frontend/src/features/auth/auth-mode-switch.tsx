'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { returnToQuery } from './return-to';

/**
 * Sign in / Create account switch shared by login and register so both pages read
 * as one flow. Plain links (same routes as the bottom links); keeps `?callbackUrl=` / `?next=`.
 */
export function AuthModeSwitch({ active }: { active: 'login' | 'register' }) {
  const suffix = returnToQuery(useSearchParams());

  return (
    <nav aria-label="Account" className="auth-mode-switch">
      <Link href={`/login${suffix}`} aria-current={active === 'login' ? 'page' : undefined}>
        Sign in
      </Link>
      <Link href={`/register${suffix}`} aria-current={active === 'register' ? 'page' : undefined}>
        Create account
      </Link>
    </nav>
  );
}
