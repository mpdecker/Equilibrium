import * as esbuild from 'esbuild';

esbuild.build({
  entryPoints: ['server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server.cjs',
  format: 'cjs',
  external: ['pg-native', 'express', 'vite', 'pg', 'drizzle-orm', '@google/genai'],
}).catch(() => process.exit(1));
