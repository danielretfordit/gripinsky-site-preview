// Раздача собранного сайта так же, как на будущем хостинге (nginx: try_files $uri $uri.html =404),
// а /api/* и всё, чего нет в сборке (редиректы из astro.config, 404), проксируется в Node-сервер Astro (npx astro preview --port 4322).
// Нужен для автотестов на сборке: astro preview отдаёт 404 на /blog, когда рядом есть blog.html и папка blog/.
// Запуск: node scripts/serve-dist.mjs  →  http://localhost:4323
import { createServer, request } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const ROOT = 'dist/client';
const PORT = Number(process.env.PORT ?? 4323);
const API = { host: 'localhost', port: Number(process.env.API_PORT ?? 4322) };
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml',
};
const isFile = (p) => { try { return statSync(p).isFile(); } catch { return false; } };

const proxy = (req, res) => {
  const p = request({ ...API, path: req.url, method: req.method, headers: req.headers }, (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); });
  p.on('error', () => { res.writeHead(502); res.end('Node-сервер недоступен: запустите npx astro preview --port 4322'); });
  req.pipe(p);
};

createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return proxy(req, res);
  const path = normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const candidates = path === '/' ? ['/index.html'] : [path, `${path}.html`, `${path}/index.html`];
  const hit = candidates.map((c) => join(ROOT, c)).find(isFile);
  if (!hit) return proxy(req, res);
  res.writeHead(200, { 'content-type': TYPES[extname(hit)] ?? 'application/octet-stream' });
  createReadStream(hit).pipe(res);
}).listen(PORT, () => console.log(`Сборка: http://localhost:${PORT} (API → ${API.port})`));
