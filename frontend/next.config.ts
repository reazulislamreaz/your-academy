import type { NextConfig } from 'next';

const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://localhost:5000';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@your-academy/shared'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${apiOrigin}/api/v1/:path*`,
      },
      {
        source: '/health',
        destination: `${apiOrigin}/health`,
      },
    ];
  },
};

export default nextConfig;
