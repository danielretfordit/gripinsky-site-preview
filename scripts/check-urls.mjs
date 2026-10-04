// Сверяет адреса старого сайта (sitemap Tilda, docs/tilda/pages.json) с собранным новым сайтом
// и пишет карту адресов docs/url-map.md. Запуск после сборки: npm run build && npm run check:urls
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const pages = JSON.parse(readFileSync('docs/tilda/pages.json', 'utf8'));
const built = (p) => p === '/' ? existsSync('dist/client/index.html') : existsSync(`dist/client${p}.html`) || existsSync(`dist/client${p}/index.html`);
const REDIRECTS = { '/courses-page': '/courses' };

const rows = Object.keys(pages).sort().map((p) => {
  if (built(p)) return [p, 'новый сайт', pages[p].title];
  if (REDIRECTS[p]) return [p, `301 на ${REDIRECTS[p]}`, pages[p].title];
  return [p, 'пока на старом сайте', pages[p].title];
});
const extra = ['/gallery', '/otzyvy', '/blog', '/oferta', '/politica', '/soglasie', '/ai'].filter((p) => !pages[p] && built(p)).map((p) => [p, 'новая страница', '']);

const counts = rows.reduce((m, r) => ((m[r[1]] = (m[r[1]] ?? 0) + 1), m), {});
const md = [
  '# Карта адресов: старый сайт и новый',
  '',
  `Сгенерировано скриптом \`npm run check:urls\`. Адресов в sitemap Tilda: ${rows.length}.`,
  '',
  ...Object.entries(counts).map(([k, v]) => `- ${k}: ${v}`),
  '',
  '| Адрес | Статус | Title на Tilda |',
  '|---|---|---|',
  ...rows.map(([p, s, t]) => `| \`${p}\` | ${s} | ${(t || '').replace(/\|/g, '/')} |`),
  '',
  '## Новые адреса',
  '',
  ...extra.map(([p]) => `- \`${p}\``),
  '',
].join('\n');
writeFileSync('docs/url-map.md', md);
console.log(Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(', '));
const missing = rows.filter((r) => r[1] === 'пока на старом сайте').map((r) => r[0]);
console.log('На старом сайте:', missing.join(' '));
