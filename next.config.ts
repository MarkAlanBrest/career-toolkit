import type { NextConfig } from 'next';

const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    '/document-creator/app': ['./extension/Document_Creator.html'],
    // pdfjs-dist looks up its worker file by relative path at runtime — webpack bundling breaks
    // that lookup (serverExternalPackages below prevents the bundling), so also make sure the
    // worker file itself is actually copied into the deployed function.
    '/api/parse-file': ['./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'],
  },
  // Load pdfjs-dist directly from node_modules at runtime instead of bundling it — bundling
  // rewrites its internal worker-file path in a way that doesn't resolve on Vercel.
  serverExternalPackages: ['pdfjs-dist'],
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
