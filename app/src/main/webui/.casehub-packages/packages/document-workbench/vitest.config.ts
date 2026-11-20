import { defineConfig } from 'vitest/config';
import path from 'path';
import { existsSync } from 'fs';

export default defineConfig({
  resolve: {
    alias: [
      { find: '@casehubio/mosaic-core', replacement: path.resolve(__dirname, '../../packages/mosaic-core/src') },
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-component/src')) ? [{ find: /^@casehubio\/pages-component\/dist\/(.*)/, replacement: path.resolve(__dirname, '../../../pages/packages/pages-component/src/$1') }] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-component/src')) ? [{ find: '@casehubio/pages-component', replacement: path.resolve(__dirname, '../../../pages/packages/pages-component/src') }] : []),
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
