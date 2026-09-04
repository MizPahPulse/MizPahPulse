import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      // Enforce coverage on the core logic layer (server/shared utilities) that
      // the unit suite owns. UI pages, API route glue, and React components are
      // intentionally excluded — they are exercised by component/e2e tests.
      // Thresholds must be kept in sync with CI: see `.github/workflows/ci.yml`.
      include: ['src/lib/**'],
      all: true,
      thresholds: {
        statements: 65,
        branches: 80,
        functions: 75,
        lines: 65,
      },
      exclude: ['node_modules/', '.next/', '**/*.d.ts', '**/*.config.*'],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mizpah-pulse/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@mizpah-pulse/types': path.resolve(__dirname, '../../packages/types/src'),
      '@mizpah-pulse/stellar': path.resolve(__dirname, '../../packages/stellar/src'),
    },
  },
});
