import type { NextConfig } from 'next';

const apiOrigin = process.env.API_INTERNAL_URL ?? 'http://localhost:5000';
const cloudName =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim() ||
  process.env.CLOUDINARY_CLOUD_NAME?.trim() ||
  '';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@your-academy/shared', 'react-pdf', 'pdfjs-dist'],
  // Root eslint.config uses typescript-eslint only — Next plugin rules referenced in
  // disable comments are not registered. Typecheck + scoped lint remain the gates.
  eslint: { ignoreDuringBuilds: true },
  // Socket.IO polling hits `/socket.io/?EIO=…`; don't 308-strip the trailing slash.
  skipTrailingSlashRedirect: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [384, 640, 750, 828, 1080, 1200, 1920],
    imageSizes: [64, 96, 128, 160, 256, 384],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: cloudName ? `/${cloudName}/**` : '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/images/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
      {
        source: '/:path*.(woff2|woff|ttf|otf)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // react-pdf / pdfjs optional native deps are unused in the browser bundle.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      encoding: false,
    };
    return config;
  },
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
