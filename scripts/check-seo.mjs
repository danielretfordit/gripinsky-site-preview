// SEO-проверка собранного сайта: мета-теги, превью, разметка, sitemap.
// Запуск после сборки: npm run build && npm run check:seo
// Ошибка = страница не готова к индексации; предупреждение = стоит поправить.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = 'dist/client';
const SITE = 'https://gripinsky.ru';
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) { if (!['_astro', 'og', 'keystatic'].includes(f)) walk(p); } else if (f.endsWith('.html')) files.push(p); } };
walk(ROOT);

const dec = (s) => s?.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (html, re) => dec(html.match(re)?.[1]);
const pageSeoByRoute = new Map();
const seoDir = 'src/content/page-seo';
if (existsSync(seoDir)) {
  for (const name of readdirSync(seoDir).filter((f) => f.endsWith('.json'))) {
    const record = JSON.parse(readFileSync(join(seoDir, name), 'utf8'));
    if (pageSeoByRoute.has(record.route)) throw new Error('Повторяется SEO-маршрут ' + record.route);
    pageSeoByRoute.set(record.route, record);
  }
}
const errors = [], warns = [];
const err = (u, m) => errors.push(`${u}: ${m}`);
const warn = (u, m) => warns.push(`${u}: ${m}`);
const titles = new Map(), descs = new Map();
const noindex = new Set();

for (const f of files) {
  const url = ('/' + relative(ROOT, f).replace(/\.html$/, '')).replace(/^\/index$/, '/');
  const html = readFileSync(f, 'utf8');
  if (/http-equiv="refresh"/i.test(html)) continue; // редиректы
  const robots = meta(html, /<meta name="robots" content="([^"]*)"/) ?? '';
  const isNoindex = robots.includes('noindex') || url === '/404';
  if (isNoindex) noindex.add(url);
  const title = meta(html, /<title>([^<]*)<\/title>/);
  const desc = meta(html, /<meta name="description" content="([^"]*)"/);
  const canon = meta(html, /<link rel="canonical" href="([^"]*)"/);
  const og = meta(html, /<meta property="og:image" content="([^"]*)"/);
  const h1 = (html.match(/<h1\b/g) || []).length;

  if (!title) err(url, 'нет title');
  if (!desc) err(url, 'нет description');
  if (h1 !== 1) err(url, `H1: ${h1}, нужен один`);
  const expectedCanonical = pageSeoByRoute.get(url)?.canonical || SITE + url;
  if (canon !== expectedCanonical) err(url, 'canonical ' + canon + ' не совпадает с ожидаемым ' + expectedCanonical);
  if (!og) err(url, 'нет og:image');
  else if (og.startsWith(SITE) && !existsSync(join(ROOT, og.slice(SITE.length)))) err(url, `og:image ${og.slice(SITE.length)} не найден в сборке`);
  for (const [, json] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(json); } catch { err(url, 'JSON-LD не разбирается'); }
  }
  if (isNoindex) continue;
  if (title && title.length > 80) warn(url, `title ${title.length} знаков (лучше до 70)`);
  if (title && /^[^a-zа-яё]*$/.test(title.replace(/\|.*$/, ''))) warn(url, `title без строчных букв: «${title}»`);
  if (desc && (desc.length < 70 || desc.length > 200)) warn(url, `description ${desc.length} знаков (лучше 120–160)`);
  (titles.get(title) ?? titles.set(title, []).get(title)).push(url);
  (descs.get(desc) ?? descs.set(desc, []).get(desc)).push(url);
}
for (const [t, u] of titles) if (t && u.length > 1) err(u.join(', '), `одинаковый title «${t}»`);
for (const [d, u] of descs) if (d && u.length > 1) warn(u.join(', '), `одинаковый description «${d.slice(0, 60)}…»`);

// sitemap: только индексируемые страницы
const maps = readdirSync(ROOT).filter((f) => /^sitemap-\d+\.xml$/.test(f));
for (const m of maps) {
  for (const [, loc] of readFileSync(join(ROOT, m), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const path = loc.replace(SITE, '') || '/';
    if (noindex.has(path)) err(path, 'в sitemap, но закрыта noindex');
    if (/\.html$|\/$/.test(path) && path !== '/') err(path, 'в sitemap адрес с .html или слэшем');
  }
}

for (const w of warns) console.log('предупреждение: ' + w);
for (const e of errors) console.log('ошибка: ' + e);
console.log(`\nПроверено страниц: ${files.length}. Ошибок: ${errors.length}, предупреждений: ${warns.length}.`);
process.exit(errors.length ? 1 : 0);
