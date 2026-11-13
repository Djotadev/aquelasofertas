// Empacota o servidor em dist/server.js (com todas as dependências) para o deploy.
import { build } from 'esbuild';
import fs from 'node:fs';

await build({
  entryPoints: ['scripts/server-entry.js'],
  outfile: 'dist/server.js',
  bundle: true,
  platform: 'node',
  external: ['node:sqlite'],
  format: 'esm',
  target: 'node20',
  logLevel: 'info',
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});
fs.writeFileSync('dist/package.json', JSON.stringify({ name: 'aquelas-orfetas', private: true, type: 'module', scripts: { start: 'node server.js' } }, null, 2) + '\n');
console.log('Pronto: dist/server.js e dist/package.json');
