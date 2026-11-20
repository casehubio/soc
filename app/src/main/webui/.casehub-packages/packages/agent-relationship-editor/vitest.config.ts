import { defineConfig, type Plugin } from 'vitest/config';
import path from 'path';

function rawCssMock(): Plugin {
  return {
    name: 'raw-css-mock',
    enforce: 'pre',
    resolveId(id) {
      if (id.includes('.css?raw') || id.includes('.css')) return id.includes('?raw') ? '\0css-raw-mock' : null;
      return null;
    },
    load(id) {
      if (id === '\0css-raw-mock') return 'export default ""';
      return null;
    },
  };
}

export default defineConfig({
  plugins: [rawCssMock()],
  resolve: {
    alias: [
      { find: '@casehubio/mosaic-agent-avatar-2d', replacement: path.resolve(__dirname, '../../packages/agent-avatar-2d/src') },
      { find: '@casehubio/mosaic-core', replacement: path.resolve(__dirname, '../../packages/mosaic-core/src') },
      { find: '@casehubio/mosaic-graph-stencil-org', replacement: path.resolve(__dirname, '../../packages/graph-stencil-org/src') },
      { find: '@casehubio/pages-diagram-core', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/pages-diagram-core/dist') },
      { find: '@casehubio/graph-core', replacement: path.resolve(__dirname, '../../.casehub-packages/packages/graph-core/dist') },
      { find: /^@casehubio\/graph-renderer\/(.*)/, replacement: path.resolve(__dirname, '../../.casehub-packages/packages/graph-renderer/dist/$1') },
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
    css: false,
    server: {
      deps: {
        inline: [/@xyflow/],
      },
    },
  },
});
