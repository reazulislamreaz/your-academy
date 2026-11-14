import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/providers';
import { fontPrimary } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Your Academy',
    template: '%s · Your Academy',
  },
  description: 'Modern MCQ learning with a fair free trial',
  icons: {
    icon: [{ url: '/images/favicon.png', type: 'image/png' }],
    apple: '/images/apple-touch-icon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="bn"
      data-scroll-behavior="smooth"
      className={fontPrimary.variable}
    >
      <body className="min-h-screen font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
