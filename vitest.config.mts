import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` path alias of apps/web/tsconfig.json for web adapter tests.
    alias: { '@': fileURLToPath(new URL('./apps/web', import.meta.url)) },
  },
  test: {
    include: ['packages/**/*.test.ts', 'apps/**/*.test.ts'],
    environment: 'node',
    passWithNoTests: false,
  },
});
