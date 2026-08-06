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
      exclude: ['node_modules/', '.next/', '**/*.d.ts', '**/*.config.*'],
      thresholds: {
        lines: 15,
        functions: 30,
        branches: 60,
        statements: 15,
      },
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
