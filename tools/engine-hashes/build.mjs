/* Bundle the real registry + engines to a browser IIFE for the harness. */
import { build } from 'esbuild';
await build({
  entryPoints: ['tools/engine-hashes/entry.ts'],
  bundle: true,
  format: 'iife',
  platform: 'browser',
  outfile: 'tools/engine-hashes/bundle.js',
  define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_ART_IMAGE_BASE': '"/preview"' },
  logLevel: 'error',
});
console.log('bundle.js written');
