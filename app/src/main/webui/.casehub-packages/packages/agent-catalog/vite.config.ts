import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@casehubio/mosaic-agent-avatar-2d': resolve(__dirname, '../../packages/agent-avatar-2d/src/index.ts'),
      '@casehubio/mosaic-avatar-step': resolve(__dirname, '../avatar-step/src/index.ts'),
      '@casehubio/mosaic-core': resolve(__dirname, '../../packages/mosaic-core/src/index.ts'),
    },
  },
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        useDefineForClassFields: false,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    teardownTimeout: 10_000,
  },
});
