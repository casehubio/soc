import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@casehubio/pages-diagram-core', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/pages-diagram-core/dist') },
      { find: '@casehubio/mosaic-graph-stencil-case', replacement: path.resolve(__dirname, '../../packages/graph-stencil-case/src') },
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
  },
});
