import { defineConfig } from 'vitest/config';
import path from 'path';
import { existsSync } from 'fs';

export default defineConfig({
  resolve: {
    alias: [
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-data/src')) ? [
        { find: /^@casehubio\/pages-data\/dist\/(.*)/, replacement: path.resolve(__dirname, '../../../pages/packages/pages-data/src/$1') },
        { find: '@casehubio/pages-data', replacement: path.resolve(__dirname, '../../../pages/packages/pages-data/src') },
      ] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-table/src')) ? [
        { find: '@casehubio/pages-table', replacement: path.resolve(__dirname, '../../../pages/packages/pages-table/src') },
      ] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-ui-tokens/src')) ? [
        { find: '@casehubio/pages-ui-tokens', replacement: path.resolve(__dirname, '../../../pages/packages/pages-ui-tokens/src') },
      ] : []),
      { find: '@casehubio/mosaic-core', replacement: path.resolve(__dirname, '../../packages/mosaic-core/src') },
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
