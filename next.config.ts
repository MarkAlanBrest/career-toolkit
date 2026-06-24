import type { NextConfig } from 'next';

const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  async headers() {
    return [
      {
        // Allow signup pages to be embedded as iframes inside Canvas LMS
        source: '/signup/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default config;
