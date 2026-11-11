// Servidor Node autônomo: serve os arquivos estáticos e entrega o resto ao React Router.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { createRequestHandler } from 'react-router';
import * as build from '../dist/apps/web/server/index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDir = path.join(here, 'apps', 'web', 'client');
const port = Number(process.env.PORT) || 3000;
const handler = createRequestHandler(build, 'production');

const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff': 'font/woff',
  '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

function serveStatic(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return false;
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { return false; }
  if (pathname.endsWith('/')) return false;
  const file = path.join(clientDir, pathname);
  if (!file.startsWith(clientDir + path.sep)) return false;
  let stat;
  try { stat = fs.statSync(file); } catch { return false; }
  if (!stat.isFile()) return false;
  res.setHeader('Content-Type', types[path.extname(file).toLowerCase()] || 'application/octet-stream');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'public, max-age=3600');
  if (req.method === 'HEAD') res.end(); else fs.createReadStream(file).pipe(res);
  return true;
}

http.createServer(async (req, res) => {
  try {
    if (serveStatic(req, res)) return;
    // Foto de produto inexistente: responde 404 direto (a página mostra o cartão ilustrado).
    if (req.url?.startsWith('/produtos/')) { res.statusCode = 404; res.end(); return; }
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) if (value !== undefined) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
    const proto = headers.get('x-forwarded-proto') || 'http';
    const init = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') { init.body = Readable.toWeb(req); init.duplex = 'half'; }
    const response = await handler(new Request(new URL(req.url, `${proto}://${headers.get('host') || 'localhost'}`), init));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => { if (key !== 'set-cookie') res.setHeader(key, value); });
    const cookies = response.headers.getSetCookie?.() ?? [];
    if (cookies.length) res.setHeader('set-cookie', cookies);
    if (response.body && req.method !== 'HEAD') Readable.fromWeb(response.body).pipe(res); else res.end();
  } catch (error) {
    console.error(error);
    res.statusCode = 500;
    res.end('Erro interno do servidor');
  }
}).listen(port, () => console.log(`Servidor ativo na porta ${port}`));
