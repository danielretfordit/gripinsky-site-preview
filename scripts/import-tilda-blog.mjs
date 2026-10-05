// Перенос статей блога Tilda (/tpost/…) в src/content/blog/*.mdoc.
// Адреса сохраняются: у статьи в frontmatter стоит legacyPath, страница собирается по нему (src/pages/tpost/[slug].astro).
// Картинки скачиваются с CDN Tilda, уменьшаются до 1600 px и лежат в src/assets/blog/<slug>/.
//
// Запуск: node scripts/import-tilda-blog.mjs [папка с сохранёнными HTML статей]
// Без папки скачивает статьи сам по sitemap-feed (с паузами: на сайте DDoS-Guard).
// Тексты переносятся как есть; уже существующие .mdoc не перезаписываются (флаг --force перезаписывает).
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SITE = 'https://gripinsky.ru';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128 Safari/537.36';
const OUT = 'src/content/blog';
const ASSETS = 'src/assets/blog';
const force = process.argv.includes('--force');
const cacheDir = process.argv.slice(2).find((a) => !a.startsWith('--'));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- HTML в дерево ----------
const VOID = new Set(['br', 'img', 'hr', 'meta', 'link', 'input', 'source', 'wbr']);
const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', laquo: '«', raquo: '»', mdash: '—', ndash: '–', hellip: '…', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', bdquo: '„', apos: "'", times: '×', minus: '−', deg: '°', middot: '·', bull: '•', copy: '©' };
const decode = (s) => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === '#') return String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
  return ENT[e.toLowerCase()] ?? m;
});
const attrsOf = (s) => Object.fromEntries([...s.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)].map((m) => [m[1].toLowerCase(), decode(m[2] ?? m[3] ?? m[4] ?? '')]));

function parse(html) {
  const root = { tag: '#root', attrs: {}, children: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:\s+[^>]*?)?)\s*(\/?)>|([^<]+)|</g;
  let m;
  while ((m = re.exec(html))) {
    const [, close, tagRaw, attrStr, selfClose, text] = m;
    const top = stack.at(-1);
    if (text !== undefined) { top.children.push({ tag: '#text', text: decode(text) }); continue; }
    if (!tagRaw) continue;
    const tag = tagRaw.toLowerCase();
    if (close) {
      const i = stack.map((n) => n.tag).lastIndexOf(tag);
      if (i > 0) stack.length = i;
      continue;
    }
    const node = { tag, attrs: attrsOf(attrStr || ''), children: [] };
    top.children.push(node);
    if (!VOID.has(tag) && !selfClose) stack.push(node);
  }
  return root;
}
const cls = (n) => (n.attrs?.class || '').split(/\s+/);
const find = (n, pred) => { if (pred(n)) return n; for (const c of n.children || []) { const r = find(c, pred); if (r) return r; } return null; };
const textOf = (n) => n.tag === '#text' ? n.text : (n.children || []).map(textOf).join('');

// ---------- дерево в Markdoc ----------
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/([*_`\[\]{}])/g, '\\$1');
const localHref = (h) => {
  if (!h) return '';
  let u = h.trim();
  u = u.replace(/^https?:\/\/(www\.)?gripinsky\.ru(?=\/|$)/, '') || '/';
  if (u.length > 1) u = u.replace(/\/+$/, '').replace(/\/(?=[?#])/, '');
  return u;
};
const videoHref = (src) => {
  const yt = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]+)/);
  if (yt) return `https://www.youtube.com/watch?v=${yt[1]}`;
  return src.startsWith('//') ? 'https:' + src : src;
};

function inline(n, ctx) {
  if (n.tag === '#text') return esc(n.text.replace(/[\r\n\t]+/g, ' '));
  const inner = () => (n.children || []).map((c) => inline(c, ctx)).join('');
  switch (n.tag) {
    case 'br': return '\n';
    case 'strong': case 'b': return wrap(inner(), '**');
    case 'em': case 'i': return wrap(inner(), '_');
    case 'a': {
      const t = inner().trim();
      const href = localHref(n.attrs.href);
      if (!t) return '';
      if (!href || href.startsWith('javascript:') || href.startsWith('#')) return t;
      return `[${t}](${href})`;
    }
    case 'img': ctx.blocks.push({ type: 'img', node: n }); return '';
    default: return inner();
  }
}
// **  текст ** → пробелы выносим наружу, иначе Markdoc не распознает выделение
function wrap(s, mark) {
  if (!s.trim()) return s;
  const lead = s.match(/^\s*/)[0], trail = s.match(/\s*$/)[0];
  const core = s.trim();
  if (core.includes('\n')) return s;
  return `${lead}${mark}${core}${mark}${trail}`;
}

const BLOCK = new Set(['div', 'p', 'ul', 'ol', 'figure', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'iframe', 'section', 'table']);

/** Блоки статьи в порядке появления */
function blocks(n, ctx, out = []) {
  let buf = [];
  const flush = () => {
    const s = buf.join('');
    buf = [];
    for (const para of s.split(/\n\s*\n+/)) {
      const lines = para.split('\n').map((l) => l.replace(/[  ]+/g, (w) => (w.includes(' ') ? ' ' : ' ')).trim()).filter(Boolean);
      if (lines.length) out.push({ type: 'p', text: lines.join('  \n') });
    }
  };
  for (const c of n.children || []) {
    if (c.tag === '#text' || !BLOCK.has(c.tag)) {
      const sub = { blocks: [] };
      buf.push(inline(c, sub));
      if (sub.blocks.length) { flush(); out.push(...sub.blocks); }
      continue;
    }
    flush();
    switch (c.tag) {
      case 'ul': case 'ol': {
        const items = (c.children || []).filter((x) => x.tag === 'li').map((li) => (li.children || []).map((x) => inline(x, { blocks: [] })).join('').replace(/\s*\n\s*/g, ' ').trim()).filter(Boolean);
        if (items.length) out.push({ type: 'list', ordered: c.tag === 'ol' || (c.children || []).some((x) => x.attrs?.['data-list'] === 'ordered'), items });
        break;
      }
      case 'figure': {
        const img = find(c, (x) => x.tag === 'img');
        const cap = find(c, (x) => x.tag === 'figcaption');
        const src = c.attrs['data-src'] || img?.attrs['data-original'] || img?.attrs.src;
        if (src) out.push({ type: 'img', src, caption: cap ? textOf(cap).trim() : '' });
        const frame = find(c, (x) => x.tag === 'iframe');
        if (frame?.attrs.src) out.push({ type: 'video', href: videoHref(frame.attrs.src) });
        break;
      }
      case 'iframe': if (c.attrs.src) out.push({ type: 'video', href: videoHref(c.attrs.src) }); break;
      case 'blockquote': {
        const inner = blocks(c, ctx, []);
        out.push({ type: 'quote', blocks: inner });
        break;
      }
      case 'h1': case 'h2': out.push({ type: 'h', level: 2, text: textOf(c).replace(/\s+/g, ' ').trim() }); break;
      case 'h3': case 'h4': case 'h5': case 'h6': out.push({ type: 'h', level: 3, text: textOf(c).replace(/\s+/g, ' ').trim() }); break;
      case 'hr': out.push({ type: 'hr' }); break;
      default: blocks(c, ctx, out);
    }
  }
  flush();
  // Картинки, попавшие внутрь абзацев (img без figure)
  return out.map((b) => (b.type === 'img' && b.node ? { type: 'img', src: b.node.attrs['data-original'] || b.node.attrs.src, caption: '' } : b));
}

// Абзац из одного полужирного фрагмента (с эмодзи-маркером Tilda впереди) = подзаголовок раздела
const EMOJI = /^[\p{Extended_Pictographic}\p{Emoji_Presentation}➕➖➡✅✔▪▫▶•️‍\s]+/u;
const EMOJI_END = /[\p{Extended_Pictographic}\p{Emoji_Presentation}️‍\s]+$/u;
function headingOf(b) {
  if (b.type !== 'p' || b.text.includes('  \n')) return null;
  const t = b.text.replace(EMOJI, '').trim();
  const m = t.match(/^\*\*([^*]+)\*\*$/);
  if (!m) return null;
  const words = m[1].replace(/\\(.)/g, '$1').trim();
  if (words.length < 6 || words.length > 90 || /[.:;,]$/.test(words)) return null;
  return words;
}

// ---------- загрузка ----------
async function getText(url) {
  for (let i = 1; i <= 3; i++) {
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-language': 'ru' } }).catch(() => null);
    if (r?.ok) return r.text();
    await wait(15000 * i);
  }
  throw new Error('не скачалось: ' + url);
}
async function getBuf(url) {
  for (let i = 1; i <= 3; i++) {
    const r = await fetch(url, { headers: { 'user-agent': UA } }).catch(() => null);
    if (r?.ok) return Buffer.from(await r.arrayBuffer());
    await wait(3000 * i);
  }
  throw new Error('картинка не скачалась: ' + url);
}

/** Сохраняет картинку уменьшенной копией; возвращает имя файла */
async function saveImage(url, dir, base) {
  const done = readdirSync(dir).find((f) => f.replace(/\.\w+$/, '') === base);
  if (done) return done;
  const buf = await getBuf(url.startsWith('//') ? 'https:' + url : url);
  const meta = await sharp(buf, { animated: true }).metadata();
  if (meta.format === 'gif' || (meta.pages ?? 1) > 1) {
    const name = `${base}.gif`;
    writeFileSync(join(dir, name), buf);
    return name;
  }
  const img = sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true });
  if (meta.hasAlpha && meta.format === 'png') {
    const name = `${base}.png`;
    writeFileSync(join(dir, name), await img.png({ compressionLevel: 9, palette: true }).toBuffer());
    return name;
  }
  const name = `${base}.jpg`;
  writeFileSync(join(dir, name), await img.flatten({ background: '#ffffff' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer());
  return name;
}

const yaml = (s) => JSON.stringify(s);
const noDash = (s) => s.replace(/\s+[—–]\s+/g, ': ').replace(/\s{2,}/g, ' ').trim();

function describe(meta, paras) {
  const src = (meta || paras.map((p) => p.text.replace(/\*\*|\\|_/g, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s*\n\s*/g, ' ')).join(' ')).replace(/\s+/g, ' ').replace(EMOJI, '').trim();
  if (src.length <= 160) return noDash(src);
  const cut = src.slice(0, 200);
  const end = Math.max(cut.lastIndexOf('. ', 160), cut.lastIndexOf('! ', 160), cut.lastIndexOf('? ', 160));
  return noDash(end > 80 ? cut.slice(0, end + 1) : cut.slice(0, cut.lastIndexOf(' ', 157)) + '…');
}

async function convert(slug, html) {
  const file = join(OUT, `${slug}.mdoc`);
  if (existsSync(file) && !force) return { slug, skipped: true };
  const doc = parse(html);
  const h1 = find(doc, (n) => n.tag === 'h1');
  const title = noDash(textOf(h1 || { children: [] }).replace(/\s+/g, ' ').replace(EMOJI, '').replace(EMOJI_END, '').trim());
  const view = find(doc, (n) => cls(n).includes('t-redactor__tte-view'));
  if (!title || !view) throw new Error('не найден заголовок или текст статьи: ' + slug);
  const date = (html.match(/itemprop="datePublished"[^>]*content="(\d{4}-\d{2}-\d{2})/) || [])[1];
  const metaDesc = (html.match(/<meta name="description" content="([^"]*)"/) || [])[1]?.trim();
  const ogImage = (html.match(/<meta property="og:image" content="([^"]+)"/) || [])[1];
  const tags = [...html.matchAll(/class="[^"]*t-feed__post-popup__tag[^"]*"[^>]*>([\s\S]*?)<\/a>/g)].map((m) => decode(m[1].replace(/<[^>]+>/g, '')).trim()).filter(Boolean);

  const list = blocks(view, {});
  // Первый абзац часто повторяет заголовок статьи
  const norm = (x) => x.replace(/\\(.)/g, '$1').replace(/\*\*|_/g, '').replace(EMOJI, '').replace(EMOJI_END, '').replace(/\s+[—–-]\s+/g, ': ').toLowerCase().trim();
  const first = list.findIndex((b) => b.type === 'p' || b.type === 'h');
  if (first >= 0 && norm(list[first].text) === norm(title)) list.splice(first, 1);
  const dir = join(ASSETS, slug);
  mkdirSync(dir, { recursive: true });
  let cover = null, n = 0;
  if (ogImage && /tildacdn|tilda\.ws/.test(ogImage)) cover = await saveImage(ogImage, dir, 'cover').catch(() => null);

  const md = [];
  const seen = new Set();
  for (const b of list) {
    if (b.type === 'p') { const h = headingOf(b); md.push(h ? `## ${h}` : b.text); }
    else if (b.type === 'h') md.push(`${'#'.repeat(b.level)} ${esc(noDash(b.text))}`);
    else if (b.type === 'list') md.push(b.items.map((it, i) => (b.ordered ? `${i + 1}. ` : '- ') + it).join('\n'));
    else if (b.type === 'hr') md.push('---');
    else if (b.type === 'video') md.push(`[Смотреть видео →](${b.href})`);
    else if (b.type === 'quote') md.push(b.blocks.filter((x) => x.type === 'p').map((x) => '> ' + x.text.replace(/\n/g, '\n> ')).join('\n>\n'));
    else if (b.type === 'img') {
      if (!b.src || seen.has(b.src)) continue;
      seen.add(b.src);
      n += 1;
      const name = await saveImage(b.src, dir, String(n).padStart(2, '0')).catch((e) => { console.warn('  ', e.message); return null; });
      if (!name) continue;
      const alt = b.caption || `${title}, иллюстрация ${n}`;
      md.push(`![${esc(alt)}](../../assets/blog/${slug}/${name})`);
      if (b.caption) md.push(`_${esc(b.caption)}_`);
    }
  }
  const body = md.join('\n\n')
    .replace(/\*\*([.,;:!?»)]+)\*\*/g, '$1') // выделенная отдельно пунктуация
    .replace(/\*\*\*\*/g, '') // пустое выделение на стыке
    .replace(/\n{3,}/g, '\n\n').trim();
  const paras = list.filter((b) => b.type === 'p' && !headingOf(b)).slice(0, 3);
  const front = [
    '---',
    `title: ${yaml(title)}`,
    `description: ${yaml(describe(metaDesc, paras))}`,
    `date: ${date}`,
    ...(cover ? [`cover: ${yaml(`../../assets/blog/${slug}/${cover}`)}`, `coverAlt: ${yaml(title)}`] : []),
    `legacyPath: ${yaml(`/tpost/${slug}`)}`,
    'draft: false',
    '---',
    '',
  ].join('\n');
  writeFileSync(file, front + body + '\n');
  return { slug, title, date, images: n + (cover ? 1 : 0), words: body.split(/\s+/).length, tags };
}

// ---------- запуск ----------
let sources;
if (cacheDir) {
  sources = readdirSync(cacheDir).filter((f) => f.endsWith('.html')).map((f) => ({ slug: f.replace(/\.html$/, ''), html: () => readFileSync(join(cacheDir, f), 'utf8') }));
} else {
  const index = await getText(`${SITE}/sitemap-feeds.xml`);
  const feeds = [...index.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const f of feeds) { await wait(4000); urls.push(...[...(await getText(f)).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])); }
  sources = urls.map((u) => ({ slug: decodeURI(u).split('/tpost/')[1], html: async () => { await wait(4500); return getText(u); } }));
}
mkdirSync(OUT, { recursive: true });
const report = [];
for (const s of sources) {
  try {
    const r = await convert(s.slug, await s.html());
    report.push(r);
    console.log(r.skipped ? `пропущено (уже есть): ${s.slug}` : `${r.date} ${s.slug}: ${r.words} слов, ${r.images} картинок`);
  } catch (e) { console.error('ОШИБКА', s.slug, e.message); report.push({ slug: s.slug, error: e.message }); }
}
mkdirSync('node_modules/.cache', { recursive: true });
writeFileSync('node_modules/.cache/tilda-blog-report.json', JSON.stringify(report, null, 2));
console.log(`\nГотово: ${report.filter((r) => r.title).length} статей, ${report.filter((r) => r.skipped).length} пропущено, ${report.filter((r) => r.error).length} ошибок`);
