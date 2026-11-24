import type { ReactNode } from 'react';
import { ProtectedContent } from '@/components/content-protection/protected-content';

/** Saved MCQs show full question text — same copy deterrents as question pages. */
export default function SavedItemsLayout({ children }: { children: ReactNode }) {
  return <ProtectedContent>{children}</ProtectedContent>;
}
