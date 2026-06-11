import type { NextConfig } from 'next';

const config: NextConfig = {
  async headers() {
    return [
      {
        // Allow the signup page to be embedded as an iframe inside Canvas LMS
        source: '/signup',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
        ],
      },
    ];
  },
};

export default config;
