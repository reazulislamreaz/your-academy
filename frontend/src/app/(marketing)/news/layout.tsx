import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  // `template` keeps "· Your Academy" on column / article pages below.
  title: { default: 'পত্রিকার গুরুত্বপূর্ণ কলাম', template: '%s · Your Academy' },
  description:
    'Browse admin-published newspaper PDF columns for BCS and government job current affairs. Free to open — no login required.',
};

export default function NewsLayout({ children }: { children: ReactNode }) {
  return children;
}
