import type { ReactNode } from 'react';
import { ProtectedContent } from '@/components/content-protection/protected-content';

/** Copy/print deterrents + watermark for learner question content (not a security boundary). */
export default function ProtectedSegmentLayout({ children }: { children: ReactNode }) {
  return <ProtectedContent>{children}</ProtectedContent>;
}
