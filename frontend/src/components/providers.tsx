'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { RouteProgress } from '@/components/loading';
import { ApiError } from '@/lib/api/client';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-error-recovery';

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        // Prefer cache reuse on soft navigations; pages override when data must be fresher.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // Bound hanging requests so pages leave the loading state on outages.
        networkMode: 'online',
        retry: (failureCount, error) => {
          // Auth and client errors should not retry (avoids refresh/throttle storms).
          if (error instanceof ApiError && error.status > 0 && error.status < 500) {
            return false;
          }
          // Brief 502/connection blips during deploys — retry a few times with backoff.
          return failureCount < 3;
        },
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
      },
      mutations: {
        retry: false,
        networkMode: 'online',
      },
    },
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(createQueryClient);

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error) || isChunkLoadError(event.message)) {
        event.preventDefault();
        reloadOnceForChunkError();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        event.preventDefault();
        reloadOnceForChunkError();
      }
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return (
    <QueryClientProvider client={client}>
      <RouteProgress />
      {children}
    </QueryClientProvider>
  );
}
