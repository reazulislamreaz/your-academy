import type { ReactNode } from 'react';
import { ProtectedContent } from '@/components/content-protection/protected-content';

/** Exam player deterrents: blur while the window is inactive (watermark comes from the parent). */
export default function SavedExamLayout({ children }: { children: ReactNode }) {
  return <ProtectedContent blurOnHidden>{children}</ProtectedContent>;
}
