import { access, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve('dist/client');
const rawBase = process.env.GITHUB_PAGES_BASE || '';
const base = rawBase.replace(/\/$/, '');

function rewriteUrl(value) {
  if (!value.startsWith('/') || value.startsWith('//')) return value;
  const marker = value.search(/[?#]/);
  const pathname = marker === -1 ? value : value.slice(0, marker);
  const suffix = marker === -1 ? '' : value.slice(marker);
  if (base && (pathname === base || pathname.startsWith(`${base}/`))) return value;
  if (pathname === '/') return `${base}/index.html${suffix}`;
  const filePath = path.posix.extname(pathname) ? pathname : `${pathname}.html`;
  return `${base}${filePath}${suffix}`;
}

async function addFlatRoutes(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const child = path.join(directory, entry.name);
    await addFlatRoutes(child);
    const index = path.join(child, 'index.html');
    const flat = path.join(directory, `${entry.name}.html`);
    try { await access(index); } catch { continue; }
    try { await access(flat); } catch { await copyFile(index, flat); }
  }
}

async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(filename);
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      const html = await readFile(filename, 'utf8');
      let rewritten = html.replace(/\b(href|src|action)=(['"])(.*?)\2/g, (_match, attr, quote, value) => {
        return `${attr}=${quote}${rewriteUrl(value)}${quote}`;
      });
      // Astro redirects use a meta refresh in static output.
      rewritten = rewritten.replace(/<meta\b[^>]*http-equiv=["']refresh["'][^>]*>/gi, (tag) =>
        tag.replace(/(content=["'][^"']*?url=)([^"']+)/i, (_match, prefix, url) => prefix + rewriteUrl(url)));
      if (rewritten !== html) await writeFile(filename, rewritten);
    }
  }
}

await addFlatRoutes(root);
await visit(root);
await writeFile(path.join(root, '.nojekyll'), '');
await writeFile(path.join(root, 'version.json'), JSON.stringify({
  commit: process.env.GITHUB_SHA || 'local-preview',
  builtAt: new Date().toISOString(),
  mode: 'static-preview',
}) + '\n');
