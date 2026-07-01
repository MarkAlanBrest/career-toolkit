import type { NextConfig } from 'next';

const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    '/document-creator/app': ['./extension/Document_Creator.html'],
  },
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
      {
        // Allow buy-credits page to be embedded in the extension iframe
        source: '/buy-credits',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
      {
        // Allow manage-credits page to be embedded in the extension iframe
        source: '/manage-credits',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default config;
