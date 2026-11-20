import { build } from 'esbuild';

await build({
  entryPoints: ['dist/server-node.js'],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  outfile: 'dist/server-node.bundle.cjs',
  banner: { js: '#!/usr/bin/env node' },
  sourcemap: 'linked',
});
