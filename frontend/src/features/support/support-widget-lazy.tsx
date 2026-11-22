'use client';

import dynamic from 'next/dynamic';

/** Lazy support FAB — keeps Socket.IO / chat off the critical marketing & auth path. */
export const SupportWidgetLazy = dynamic(
  () =>
    import('@/features/support/support-widget').then((m) => m.SupportWidget),
  { ssr: false },
);
