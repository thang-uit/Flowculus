import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  // Keep the local review surface clean; production is unaffected.
  devIndicators: false,
  poweredByHeader: false,
  // Keep the LAN preview usable from a phone/tablet during local review.
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.24'],
  transpilePackages: [
    '@flowculus/analysis-engine',
    '@flowculus/drawio-adapter',
    '@flowculus/file-formats',
    '@flowculus/formula-renderer',
    '@flowculus/process-model',
    '@flowculus/validation',
  ],
};

export default nextConfig;
