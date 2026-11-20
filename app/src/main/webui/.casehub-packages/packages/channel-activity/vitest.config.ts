import { defineConfig } from 'vitest/config';
import path from 'path';
import { existsSync } from 'fs';

export default defineConfig({
  resolve: {
    alias: [
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-primitives/src')) ? [{ find: '@casehubio/pages-primitives', replacement: path.resolve(__dirname, '../../../pages/packages/pages-primitives/src') }] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-ui-components/src')) ? [{ find: '@casehubio/pages-ui-components', replacement: path.resolve(__dirname, '../../../pages/packages/pages-ui-components/src') }] : []),
      { find: '@casehubio/mosaic-core', replacement: path.resolve(__dirname, '../../packages/mosaic-core/src') },
      { find: '@casehubio/mosaic-split-workbench', replacement: path.resolve(__dirname, '../split-workbench/src') },
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-ui-tokens/src')) ? [{ find: '@casehubio/pages-ui-tokens', replacement: path.resolve(__dirname, '../../../pages/packages/pages-ui-tokens/src') }] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-component/src')) ? [{ find: /^@casehubio\/pages-component\/dist\/(.*)/, replacement: path.resolve(__dirname, '../../../pages/packages/pages-component/src/$1') }] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-component/src')) ? [{ find: '@casehubio/pages-component', replacement: path.resolve(__dirname, '../../../pages/packages/pages-component/src') }] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-data/src')) ? [{ find: /^@casehubio\/pages-data\/dist\/(.*)/, replacement: path.resolve(__dirname, '../../../pages/packages/pages-data/src/$1') }] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-data/src')) ? [{ find: '@casehubio/pages-data', replacement: path.resolve(__dirname, '../../../pages/packages/pages-data/src') }] : []),
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
    exclude: ['dist/**', 'node_modules/**'],
  },
});
