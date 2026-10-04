// Импорт каталога и мета-тегов со старого сайта на Tilda.
// Запуск: npm run import:tilda            (создать недостающие записи, отчёт о расхождениях цен)
//         npm run import:tilda -- --pages (ещё и обойти все страницы sitemap: title, description, тексты)
// Существующие записи курсов НЕ перезаписываются: только отчёт о расхождениях.
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';

const SITE = 'https://gripinsky.ru';
const STORE = 'https://store.tildaapi.com/api/getproductslist/?recid=0&getparts=true&getoptions=true&slice=1&size=200&storepartuid=';
const PART_PRODUCTS = '814726918511';
const PART_CATEGORIES = '940922637571';
const OUT_COURSES = 'src/content/courses';
const OUT_COVERS = 'src/assets/courses';
const OUT_DOCS = 'docs/tilda';
const withPages = process.argv.includes('--pages');

// Названия в обычном регистре вместо капса Tilda
const TITLES = {
  modeling1: 'Моделирование в 3ds Max. Level 1',
  modeling2: 'Сложное моделирование в 3ds Max. Level 2',
  vizualization3: 'Визуализация в 3ds Max и Corona. Level 3',
  gamedevlevel1: 'GameDev. Level 1',
  gamedevlevel2: 'GameDev. Level 2',
  speedtree: 'SpeedTree',
  unrealenginelevel1: 'Unreal Engine. Level 1',
  maya_level1: 'Maya. Level 1',
  'v-ray': 'Визуализация в 3ds Max и V-Ray',
  substancepainter: 'Substance Painter',
  azbukaps: 'Азбука Adobe Photoshop',
  interiorpro: 'Интерьерная визуализация PRO',
  exteriorpro: 'Экстерьерная визуализация PRO',
  residential_complex: 'Масштабные ЖК',
  materialspro: 'Материалы Corona PRO',
  art_pro: 'ART.PRO: художественная подготовка',
  '3dstock': 'Моделирование под стоки',
  zbrush0: 'ZBrush с нуля',
  stylized_character: 'Стилизованный персонаж',
  zbrushportret: 'Портрет человека в ZBrush',
  blender: 'Визуализация в Blender',
  marvelous: 'Marvelous Designer Furniture',
  ai: 'Нейросети для 3D',
  '1-2lvl': 'Пакет: моделирование в 3ds Max, уровни 1 и 2',
  '1-2-3lvl': 'Пакет: 3ds Max и Corona, уровни 1, 2 и 3',
  '1-2-3lvl-vray': 'Пакет: 3ds Max и V-Ray, уровни 1, 2 и 3',
  '2-3lvl': 'Пакет: уровни 2 и 3',
  '2-3lvl-vray': 'Пакет: уровни 2 и 3 с V-Ray',
  photoshoppro: 'Пакет Adobe Photoshop PRO',
  'p_visualisation-absolute': 'Пакет «Коммерческая визуализация ABSOLUTE»',
  archvizpro: 'Пакет «Архитектурная визуализация PRO»',
  'forest-railclone': 'Пакет Forest Pack + RailClone',
  p_zbrushabsolute: 'Пакет ZBrush ABSOLUTE',
  p_texturegamedev: 'Пакет «Текстурирование под GameDev»',
  'p_gamedev_1-2-zb-t': 'Пакет GameDev: Level 1, 2, ZBrush и текстурирование',
  p_ext_full_pack: 'Пакет «Экстерьеры Full Pack»',
  demo_gamedev: 'GameDev mini',
  blender_mini: 'Визуализация в Blender mini',
  ue_mini: 'Unreal Engine mini',
  interiorpro_mini: 'Интерьеры PRO mini',
  vizualization3_mini: 'Визуализация в 3ds Max и Corona mini',
  paket_ind5: '5 индивидуальных занятий',
  paket_ind10: '10 индивидуальных занятий',
  uslugi_ind: 'Индивидуальное занятие',
  uslugi_portfolio: 'Помощь с портфолио',
  uslugi_skp: 'Сопровождение первого проекта',
  uslugi_nastavnik: 'Работа с наставником',
  podarok5: 'Подарочный сертификат на 5 000 ₽',
  podarok10: 'Подарочный сертификат на 10 000 ₽',
  podarok15: 'Подарочный сертификат на 15 000 ₽',
  podarok20: 'Подарочный сертификат на 20 000 ₽',
  podarok50: 'Подарочный сертификат на 50 000 ₽',
  epc: 'EPC',
};

const TYPE = { 'КУРС': 'course', 'ПАКЕТ': 'package', 'ПЛАГИН': 'plugin', 'УСЛУГА': 'service', 'БЕСПЛАТНЫЙ КУРС': 'free' };
const cap = (s) => s.toLowerCase().replace(/(^|\s|-)([a-zа-яё])/g, (m, a, b) => a + b.toUpperCase());
const money = (v) => {
  if (v == null || v === '') return null;
  const n = Number(String(v).replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

async function getText(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Macintosh) gripinsky-import' } });
      if (r.ok) return r.text();
      if (r.status === 404) return null;
    } catch {}
    await sleep(4000 * (i + 1));
  }
  return null;
}

const decode = (s) => s
  .replace(/<br\s*\/?>/gi, '\n')
  .replace(/<[^>]+>/g, '')
  .replace(/&nbsp;/g, ' ').replace(/&laquo;/g, '«').replace(/&raquo;/g, '»').replace(/&mdash;/g, '—')
  .replace(/&ndash;/g, '–').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
  .replace(/[ \t]+/g, ' ').trim();

function pageMeta(html) {
  const pick = (re) => { const m = html.match(re); return m ? decode(m[1]) : ''; };
  const atoms = [...html.matchAll(/class=['"]tn-atom['"][^>]*>([\s\S]*?)<\/(?:div|a|h1|h2|h3)>/g)]
    .map((m) => decode(m[1])).filter((t) => t && t.length > 1);
  const blocks = [...html.matchAll(/class="t-(?:title|descr|text|name)[^"]*"[^>]*>([\s\S]*?)<\/div>/g)]
    .map((m) => decode(m[1])).filter((t) => t && t.length > 1);
  return {
    title: pick(/<title>([\s\S]*?)<\/title>/i),
    description: pick(/<meta name="description" content="([^"]*)"/i),
    ogImage: pick(/<meta property="og:image" content="([^"]*)"/i),
    h1: pick(/<h1[^>]*>([\s\S]*?)<\/h1>/i),
    texts: [...new Set([...atoms, ...blocks])],
  };
}

async function download(url, dst) {
  const r = await fetch(url);
  if (!r.ok) return false;
  writeFileSync(dst, Buffer.from(await r.arrayBuffer()));
  return true;
}

mkdirSync(OUT_COURSES, { recursive: true });
mkdirSync(OUT_COVERS, { recursive: true });
mkdirSync(join(OUT_DOCS, 'pages'), { recursive: true });

const products = (await getJson(STORE + PART_PRODUCTS)).products;
const categories = (await getJson(STORE + PART_CATEGORIES)).products;
writeFileSync(join(OUT_DOCS, 'products.json'), JSON.stringify(products, null, 2));
writeFileSync(join(OUT_DOCS, 'categories.json'), JSON.stringify(categories.map((c) => ({ title: c.title, url: c.url })), null, 2));

let pages = {};
if (withPages) {
  const sm = await getText(SITE + '/sitemap.xml');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const urls = [];
  for (const loc of locs) {
    if (loc.endsWith('.xml')) {
      const sub = await getText(loc);
      if (sub) urls.push(...[...sub.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
    } else urls.push(loc);
  }
  const unique = [...new Set(urls)].filter((u) => u.startsWith(SITE) && !u.includes('/tproduct/'));
  console.log(`Страниц в sitemap: ${unique.length}`);
  for (const url of unique) {
    const path = url.replace(SITE, '') || '/';
    const html = await getText(url);
    if (!html) { console.warn('  нет ответа:', path); continue; }
    const meta = pageMeta(html);
    pages[path] = { title: meta.title, description: meta.description, h1: meta.h1, ogImage: meta.ogImage };
    const name = path === '/' ? 'index' : path.slice(1).replace(/\//g, '--');
    writeFileSync(join(OUT_DOCS, 'pages', name + '.txt'), meta.texts.join('\n\n'));
    process.stdout.write('.');
    await sleep(1500);
  }
  console.log('');
  writeFileSync(join(OUT_DOCS, 'pages.json'), JSON.stringify(pages, null, 2));
} else if (existsSync(join(OUT_DOCS, 'pages.json'))) {
  pages = JSON.parse(readFileSync(join(OUT_DOCS, 'pages.json'), 'utf8'));
}

const report = [];
let created = 0;
for (const p of products) {
  const path = p.url.replace(SITE, '');
  const slug = path.slice(1);
  const chars = p.characteristics || [];
  const typeRu = chars.filter((c) => c.title === 'ТИП').map((c) => c.value);
  const type = TYPE[typeRu.includes('БЕСПЛАТНЫЙ КУРС') ? 'БЕСПЛАТНЫЙ КУРС' : typeRu[0]] || 'course';
  const price = money(p.price) ?? 0;
  const oldPrice = money(p.priceold);
  const file = join(OUT_COURSES, slug + '.json');

  if (existsSync(file)) {
    const cur = JSON.parse(readFileSync(file, 'utf8'));
    if (cur.price !== price) report.push(`${path}: цена на сайте ${cur.price}, в Tilda ${price}`);
    continue;
  }

  let cover;
  try {
    const gallery = JSON.parse(p.gallery || '[]');
    const img = gallery[0]?.img;
    if (img) {
      const ext = (extname(new URL(img).pathname) || '.jpg').toLowerCase();
      const dst = join(OUT_COVERS, slug + ext);
      if (existsSync(dst) || (await download(img, dst))) cover = `../../assets/courses/${slug}${ext}`;
    }
  } catch {}

  const meta = pages[path] || {};
  const entry = {
    title: TITLES[slug] || cap(p.title),
    short: decode(p.descr || ''),
    legacyPath: path,
    status: slug.startsWith('podarok') ? 'hidden' : 'active',
    type,
    price,
    oldPrice,
    professions: chars.filter((c) => c.title === 'ПРОФЕССИЯ').map((c) => cap(c.value)),
    software: chars.filter((c) => c.title === 'ПРОГРАММНЫЙ ПАКЕТ').map((c) => c.value),
    level: chars.filter((c) => /УРОВЕНЬ|РАЗДЕЛ/.test(c.title)).map((c) => cap(c.value))[0] || null,
    ...(cover ? { cover } : {}),
    blocks: [],
    seo: { title: meta.title || '', description: meta.description || '' },
    getcourse: { offerCode: '' },
    tildaUid: String(p.uid),
  };
  writeFileSync(file, JSON.stringify(entry, null, 2) + '\n');
  created++;
}

console.log(`Товаров в Tilda: ${products.length}, создано записей: ${created}`);
if (report.length) {
  console.log('Расхождения цен:');
  for (const line of report) console.log('  ' + line);
}
