import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@mizpah-pulse/types': path.resolve(__dirname, '../../packages/types/src'),
      '@mizpah-pulse/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@mizpah-pulse/database': path.resolve(__dirname, '../../packages/database/src'),
      '@mizpah-pulse/stellar': path.resolve(__dirname, '../../packages/stellar/src'),
    },
  },
});
