import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_BUILD_DIR || (process.env.NEXT_TEST_BUILD === 'true' ? '.next-test' : '.next'),
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com; connect-src 'self' https://*.googleapis.com wss://*.firebaseio.com https://*.firebaseio.com${process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true' ? ' http://127.0.0.1:9095 http://127.0.0.1:8085' : ''}; img-src 'self' data: https://firebasestorage.googleapis.com blob:; style-src 'self' 'unsafe-inline';`,
          }
        ],
      },
    ];
  },
};

export default nextConfig;
