'use client';

import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';
import { PageLoader } from '@/components/loading';

/**
 * react-pdf / pdfjs touch `document` at import time — never SSR this module.
 */
export const PdfViewer = dynamic(
  () => import('./pdf-viewer').then((m) => m.PdfViewer),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-0 flex-1 items-center justify-center">
        <PageLoader compact label="Loading PDF viewer" />
      </div>
    ),
  },
);

export type PdfViewerProps = ComponentProps<typeof PdfViewer>;
