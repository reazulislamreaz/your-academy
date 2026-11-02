import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { SiteHeader } from '@/components/site-header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Your Academy',
  description: 'Modern MCQ learning with a fair free trial',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <SiteHeader />
          <div className="mx-auto w-full max-w-6xl px-6 pb-16">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
