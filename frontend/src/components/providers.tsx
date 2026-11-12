'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { BrowsingHeartbeat } from '@/features/analytics/browsing-heartbeat';
import { ApiError } from '@/lib/api/client';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            staleTime: 30_000,
            retry: (failureCount, error) => {
              // Auth and client errors should not retry (avoids refresh/throttle storms).
              if (error instanceof ApiError && error.status > 0 && error.status < 500) {
                return false;
              }
              return failureCount < 1;
            },
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <BrowsingHeartbeat />
      {children}
    </QueryClientProvider>
  );
}
