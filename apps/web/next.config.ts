import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  agentRules: false,
  // Keep the local review surface clean; production is unaffected.
  devIndicators: false,
  poweredByHeader: false,
  // Keep the LAN preview usable from a phone/tablet during local review.
  allowedDevOrigins: ['localhost', '127.0.0.1', '192.168.1.24'],
  // Baseline hardening for every route. No CSP yet: Next.js inline bootstrap
  // scripts would need nonces; see README "Security".
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
        ],
      },
    ];
  },
  transpilePackages: [
    '@flowculus/analysis-engine',
    '@flowculus/drawio-adapter',
    '@flowculus/file-formats',
    '@flowculus/formula-renderer',
    '@flowculus/graph-layout',
    '@flowculus/process-mining',
    '@flowculus/process-model',
    '@flowculus/validation',
    '@flowculus/xml-tree',
  ],
};

export default nextConfig;
