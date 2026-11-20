import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@casehubio/graph-core', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/graph-core/dist') },
      { find: '@casehubio/graph-renderer', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/graph-renderer/dist') },
    ],
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
    passWithNoTests: true,
  },
});
