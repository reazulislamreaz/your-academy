import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { ProtectedContent } from '@/components/content-protection/protected-content';

/** Personal attempt results are never indexed. */
export const metadata: Metadata = { robots: { index: false, follow: false } };

/** Results reveal answers: keep deterrents, but no inactive-window blur (exam is over). */
export default function ResultSegmentLayout({ children }: { children: ReactNode }) {
  return <ProtectedContent blurOnHidden={false}>{children}</ProtectedContent>;
}
