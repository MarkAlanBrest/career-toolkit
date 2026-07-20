import type { NextConfig } from 'next';

const config: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  outputFileTracingIncludes: {
    // Document Creator is temporarily disabled (moved to disabled/app/document-creator and
    // disabled/app/api/document-creator to stay under Vercel's Hobby-plan function limit).
    // Restore this entry when both folders move back under app/:
    // '/document-creator/app': ['./extension/Document_Creator.html'],

    // pdfjs-dist looks up its worker file, standard fonts, and CMaps by relative path at runtime
    // — webpack bundling breaks that lookup (serverExternalPackages below prevents the bundling),
    // so also make sure these files are actually copied into the deployed function.
    '/api/parse-file': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/standard_fonts/**',
      './node_modules/pdfjs-dist/cmaps/**',
    ],
  },
  // Load pdfjs-dist directly from node_modules at runtime instead of bundling it — bundling
  // rewrites its internal worker-file path in a way that doesn't resolve on Vercel.
  serverExternalPackages: ['pdfjs-dist'],
};

export default config;
