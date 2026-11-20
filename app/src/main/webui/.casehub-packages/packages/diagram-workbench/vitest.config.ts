import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@casehubio/mosaic-core', replacement: path.resolve(__dirname, '../../packages/mosaic-core/src') },
      { find: '@casehubio/mosaic-casehub-diagram', replacement: path.resolve(__dirname, '../casehub-diagram/src/casehub-diagram.ts') },
      { find: '@casehubio/mosaic-swf-diagram', replacement: path.resolve(__dirname, '../swf-diagram/src/swf-diagram.ts') },
      { find: '@casehubio/pages-data', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/pages-data/src') },
      { find: '@casehubio/pages-ui-components', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/pages-ui-components/src') },
      { find: '@casehubio/mosaic-graph-stencil-case', replacement: path.resolve(__dirname, '../../packages/graph-stencil-case/src') },
      { find: '@casehubio/mosaic-graph-stencil-swf', replacement: path.resolve(__dirname, '../../packages/graph-stencil-swf/src') },
      { find: '@casehubio/pages-diagram-core', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/pages-diagram-core/src') },
      { find: '@casehubio/graph-renderer', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/graph-renderer/src') },
      { find: '@casehubio/graph-core', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/graph-core/src') },
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
