import { defineConfig } from 'vitest/config';
import path from 'path';
import { existsSync } from 'fs';

export default defineConfig({
  resolve: {
    alias: [
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-ui-tokens/src')) ? [{ find: '@casehubio/pages-ui-tokens', replacement: path.resolve(__dirname, '../../../pages/packages/pages-ui-tokens/src') }] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-component/src')) ? [{ find: '@casehubio/pages-component', replacement: path.resolve(__dirname, '../../../pages/packages/pages-component/src') }] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-data/src')) ? [{ find: '@casehubio/pages-data/dist/sse/sse-manager.js', replacement: path.resolve(__dirname, '../../../pages/packages/pages-data/src/sse/sse-manager.ts') }] : []),
      ...(existsSync(path.resolve(__dirname, '../../../pages/packages/pages-data/src')) ? [{ find: '@casehubio/pages-data', replacement: path.resolve(__dirname, '../../../pages/packages/pages-data/src') }] : []),
    ],
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
