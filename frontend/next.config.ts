import type { NextConfig } from 'next';

const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://localhost:5000';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@your-academy/shared'],
  // Socket.IO polling hits `/socket.io/?EIO=…`; don't 308-strip the trailing slash.
  skipTrailingSlashRedirect: true,
  // Tunnel / preview hosts hitting local `next dev` (avoids cross-origin /_next warnings).
  allowedDevOrigins: ['reaz3000.syedbipul.me', 'localhost', '127.0.0.1'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiOrigin}/api/v1/:path*`,
      },
      // Same-origin Socket.IO so HttpOnly cookies (auth + support_guest_token) are sent (DEC-029).
      {
        source: '/socket.io',
        destination: `${apiOrigin}/socket.io/`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${apiOrigin}/socket.io/:path*`,
      },
      {
        source: '/health',
        destination: `${apiOrigin}/health`,
      },
    ];
  },
};

export default nextConfig;
