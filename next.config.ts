import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Emit a self-contained server bundle in `.next/standalone` (server.js + only
  // the node_modules it actually traces). This is what the Docker runtime stage
  // copies, keeping the final image small.
  output: 'standalone',
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
