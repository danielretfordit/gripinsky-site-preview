// Ссылки в статьях блога, перенесённых с Tilda: страницы, которых ещё нет на новом сайте,
// ведут на старый сайт полным адресом (как в подвале), относительные «modeling1» становятся «/modeling1».
// Запуск после сборки (нужен dist/ со списком страниц): npm run build && node scripts/fix-blog-links.mjs
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';

const DIR = 'src/content/blog';
const OLD = 'https://gripinsky.ru';
const REDIRECTS = { '/news': '/blog', '/courses-page': '/courses' };
const built = (p) => p === '/' || existsSync(`dist/client${p}.html`) || existsSync(`dist/client${p}/index.html`) || existsSync(`dist/client${p}`);
if (!existsSync('dist/client/index.html')) { console.error('Сначала npm run build'); process.exit(1); }

let changed = 0;
const log = [];
for (const f of readdirSync(DIR).filter((x) => x.endsWith('.mdoc'))) {
  const src = readFileSync(`${DIR}/${f}`, 'utf8');
  const out = src.replace(/\]\(([^)\s]+)\)/g, (m, href) => {
    if (/^(https?:|mailto:|tel:|#|\.\.?\/)/.test(href)) return m;
    let url = href.startsWith('/') ? href : `/${href}`;
    const [, path, rest = ''] = url.match(/^([^?#]*)(.*)$/);
    const clean = path.replace(/\/+$/, '') || '/';
    if (REDIRECTS[clean]) url = REDIRECTS[clean] + rest;
    else if (!built(clean)) url = `${OLD}${clean}${rest}`;
    else url = clean + rest;
    if (url !== href) log.push(`${f}: ${href} → ${url}`);
    return `](${url})`;
  });
  if (out !== src) { writeFileSync(`${DIR}/${f}`, out); changed++; }
}
console.log(log.join('\n'));
console.log(`Статей изменено: ${changed}, ссылок: ${log.length}`);
