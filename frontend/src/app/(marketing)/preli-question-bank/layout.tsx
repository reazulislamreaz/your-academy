import type { ReactNode } from 'react';

/** Metadata lives in page.tsx so set pages below do not inherit the list page's title / og:url. */
export default function PreliQuestionBankLayout({ children }: { children: ReactNode }) {
  return children;
}
