import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // pdfjs-dist (pulled in by react-pdf for the PDF previewer) optionally
    // requires Node's `canvas` for server-side rendering. We only render in the
    // browser, so stub it out to avoid Turbopack resolution errors.
    resolveAlias: {
      canvas: './empty-module.ts',
    },
  },
};

export default nextConfig;
