import { build } from 'esbuild';

await build({
  entryPoints: ['src/diagram-entry.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  outfile: 'dist/diagram-panel.bundle.js',
  sourcemap: 'linked',
  ignoreAnnotations: true,
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  loader: { '.css': 'text' },
  plugins: [{
    name: 'vite-raw-compat',
    setup(b) {
      b.onResolve({ filter: /\?raw$/ }, async args => {
        const clean = args.path.replace(/\?raw$/, '');
        const result = await b.resolve(clean, { resolveDir: args.resolveDir, kind: 'import-statement' });
        if (result.errors.length > 0) return { errors: result.errors };
        return { path: result.path };
      });
    },
  }],
});
