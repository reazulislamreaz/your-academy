'use client';

import type { CSSProperties } from 'react';
import { TrialStatusChip } from '@/components/access/trial-status-chip';
import { BrandMark } from './brand-mark';
import { LearnerMobileNav } from './learner-mobile-nav';
import { UpdatesMenu } from './updates-menu';
import { UserMenu } from './user-menu';

/**
 * Compact utilities bar. Page titles live in `PageHeader` to avoid duplicate chrome
 * with the sidebar + in-page headers.
 */
export function AppHeader() {
  return (
    <header
      className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--line)] bg-white/90 px-3 backdrop-blur-md sm:h-16 sm:gap-3 sm:px-6 sm:[--header-h:4rem]"
      style={{ '--header-h': '3.5rem' } as CSSProperties}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div className="lg:hidden">
          <BrandMark href="/home" />
        </div>
        <p className="hidden truncate text-sm font-medium text-[var(--muted-strong)] lg:block">
          Study console
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
        <div className="hidden min-[400px]:block">
          <TrialStatusChip />
        </div>
        <UpdatesMenu />
        <div className="hidden md:block">
          <UserMenu />
        </div>
        <LearnerMobileNav />
      </div>
    </header>
  );
}
