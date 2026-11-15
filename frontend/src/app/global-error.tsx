'use client';

import { useEffect } from 'react';
import { isChunkLoadError, reloadOnceForChunkError } from '@/lib/chunk-error-recovery';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      reloadOnceForChunkError();
    }
  }, [error]);

  return (
    <html lang="bn">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#f7f5f1',
          color: '#1c1917',
          padding: 24,
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Application error</h1>
          <p style={{ fontSize: 14, opacity: 0.75, marginBottom: 20 }}>
            A client-side exception occurred. If you just opened the site after an update, reload
            once to fetch the latest assets.
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                border: 0,
                borderRadius: 999,
                padding: '10px 18px',
                background: '#0f766e',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                border: '1px solid #d6d3d1',
                borderRadius: 999,
                padding: '10px 18px',
                background: '#fff',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Reload
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
