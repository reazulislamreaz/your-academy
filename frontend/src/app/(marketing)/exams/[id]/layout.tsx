import type { ReactNode } from 'react';
import { ProtectedContent } from '@/components/content-protection/protected-content';

/** Exam player deterrents: watermark, copy/print blocking, blur while the window is inactive. */
export default function ProtectedExamLayout({ children }: { children: ReactNode }) {
  return <ProtectedContent blurOnHidden>{children}</ProtectedContent>;
}
