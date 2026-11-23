'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { ShieldAlert } from 'lucide-react';
import { ROLE_LABELS, UserRole } from '@your-academy/shared';
import { Button } from '@/components/ui/button';
import { Surface } from '@/components/ui/surface';
import { useMe } from '@/features/auth/use-auth';
import { canAccessAdminPath, defaultAdminPathForRole } from '@/lib/auth/admin-access';

/**
 * Per-section dashboard gate (DEC-048). A moderator opening an admin-only URL
 * directly sees "Access denied" instead of the page. UX only — the API returns
 * 403 for the same permissions regardless of what the UI renders.
 */
export function AdminRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/admin';
  const role = useMe().data?.role;

  if (!role || canAccessAdminPath(role, pathname)) return <>{children}</>;

  const roleLabel = ROLE_LABELS[role as UserRole] ?? role;
  return (
    <Surface className="mx-auto mt-6 max-w-xl p-6 sm:p-8" role="alert" aria-labelledby="access-denied-title">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[var(--highlight-soft)] text-[var(--highlight)]">
          <ShieldAlert className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 space-y-2">
          <h1 id="access-denied-title" className="font-display text-xl font-bold text-[var(--ink)]">
            Access denied
          </h1>
          <p className="text-sm leading-relaxed text-[var(--muted-strong)]">
            Your {roleLabel} account can&rsquo;t open this section. Ask an Admin if you need access.
          </p>
          <div className="pt-2">
            <Link href={defaultAdminPathForRole(role)}>
              <Button size="sm">Go to my dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    </Surface>
  );
}
