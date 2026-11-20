import { build } from 'esbuild';

await build({
  entryPoints: ['dist/index.js'],
  bundle: true,
  format: 'esm',
  outfile: 'dist/components.js',
  minify: true,
  sourcemap: 'linked',
});
