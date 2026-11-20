import { existsSync } from 'fs';
import path from 'path';
import { defineConfig } from 'vitest/config';

const pagesPackage = (name: string) => path.resolve(__dirname, `../../../pages/packages/${name}/src`);

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@casehubio/mosaic-core',
        replacement: path.resolve(__dirname, '../../packages/mosaic-core/src'),
      },
      ...(existsSync(pagesPackage('pages-primitives'))
        ? [{ find: '@casehubio/pages-primitives', replacement: pagesPackage('pages-primitives') }]
        : []),
      ...(existsSync(pagesPackage('pages-component'))
        ? [
            {
              find: /^@casehubio\/pages-component\/dist\/(.*)/,
              replacement: `${pagesPackage('pages-component')}/$1`,
            },
            { find: '@casehubio/pages-component', replacement: pagesPackage('pages-component') },
          ]
        : []),
      ...(existsSync(pagesPackage('pages-data'))
        ? [
            {
              find: /^@casehubio\/pages-data\/dist\/(.*)/,
              replacement: `${pagesPackage('pages-data')}/$1`,
            },
            { find: '@casehubio/pages-data', replacement: pagesPackage('pages-data') },
          ]
        : []),
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
