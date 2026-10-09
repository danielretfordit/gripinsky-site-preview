// Проверка стилей по правилам гайдлайна (docs/design/guidelines.md).
// Запуск: node scripts/lint-css.mjs [--strict] [--verbose]
// Без --strict только предупреждает (код выхода 0), с --strict падает при нарушениях.
import fs from 'node:fs';
import path from 'node:path';

const STRICT = process.argv.includes('--strict');
const VERBOSE = process.argv.includes('--verbose');
const ROOT = path.resolve('src');
// Архив дизайн-вариантов не входит в сайт
const SKIP = [/[/\\]pages[/\\]design[/\\]/, /[/\\]components[/\\]design[/\\]/];
const TOKENS_FILE = path.join(ROOT, 'styles', 'global.css');

/** Разрешённые точки перелома 560 / 768 / 1024 / 1280 (как --breakpoint-* Tailwind) и соседние значения для пары min/max.
 *  Раскладку, которая зависит от ширины блока (шапка, карточки), переключают container queries. */
const BREAKPOINTS = new Set([559.98, 560, 561, 767, 767.98, 768, 1023, 1023.98, 1024, 1279, 1279.98, 1280]);

const files = [];
const walk = (d) => {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (SKIP.some((r) => r.test(p))) continue;
    if (e.isDirectory()) walk(p);
    else if (/\.(astro|css|tsx|ts)$/.test(e.name)) files.push(p);
  }
};
walk(ROOT);

const rules = {
  breakpoint: { title: 'точка перелома вне набора 560/768/1024/1280', hits: [] },
  hex: { title: 'hex-цвет вне токенов global.css', hits: [] },
  hover: { title: ':hover без @media (hover: hover)', hits: [] },
  radius: { title: 'радиус вне правила 2 px (rounded-full, rounded-[Npx], border-radius в px)', hits: [] },
  fixedHeight: { title: 'фиксированная высота h-[Npx] / height: Npx у блока', hits: [] },
  vh: { title: '100vh (на телефоне и в Telegram нужен svh/dvh)', hits: [] },
  fontSize: { title: 'кегль в px вне ролей --type-* (font-size: Npx, text-[Npx])', hits: [] },
};

const lineOf = (src, idx) => src.slice(0, idx).split('\n').length;
const rel = (f) => path.relative(process.cwd(), f);

/** CSS из файла: целиком для .css, содержимое <style> для .astro */
function cssBlocks(file, src) {
  if (file.endsWith('.css')) return [{ css: src, offset: 0 }];
  const out = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g;
  let m;
  while ((m = re.exec(src))) out.push({ css: m[1], offset: m.index + m[0].indexOf(m[1]) });
  return out;
}

/** :hover внутри правила, которое не вложено в @media (hover: hover) */
function hoverOutsideMedia(css) {
  const res = [];
  const stack = [];
  let prelude = '';
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') { const end = css.indexOf('*/', i + 2); i = end < 0 ? css.length : end + 1; continue; }
    if (c === '{') {
      const sel = prelude.trim();
      const guarded = stack.some((s) => /hover\s*:\s*hover|any-hover\s*:\s*hover/.test(s));
      if (/:hover/.test(sel) && !sel.startsWith('@') && !guarded) res.push({ idx: start, sel: sel.replace(/\s+/g, ' ').slice(0, 80) });
      stack.push(sel);
      prelude = ''; start = i + 1;
    } else if (c === '}') { stack.pop(); prelude = ''; start = i + 1; }
    else if (c === ';' ) { prelude = ''; start = i + 1; }
    else { if (!prelude.trim()) start = i; prelude += c; }
  }
  return res;
}

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const isTokens = file === TOKENS_FILE;
  const add = (rule, idx, text) => rules[rule].hits.push(`${rel(file)}:${lineOf(src, idx)}  ${text}`);

  for (const m of src.matchAll(/@media[^{]*?\(\s*(?:min|max)-width\s*:\s*([\d.]+)px/g)) {
    if (!BREAKPOINTS.has(Number(m[1]))) add('breakpoint', m.index, m[0].replace(/\s+/g, ' ').slice(0, 60));
  }
  for (const m of src.matchAll(/@media[^{]*?\(\s*width\s*[<>]=?\s*([\d.]+)px/g)) {
    if (!BREAKPOINTS.has(Number(m[1]))) add('breakpoint', m.index, m[0].replace(/\s+/g, ' ').slice(0, 60));
  }
  if (!isTokens) {
    for (const m of src.matchAll(/(?<![\w&-])#[0-9a-fA-F]{3,8}\b(?![\w-]*=)/g)) {
      // Пропускаем якоря в адресах и id в разметке
      const before = src.slice(Math.max(0, m.index - 12), m.index);
      if (/href=["'{`]?[^"'\s]*$|['"`]\/?$|id=|url\(/.test(before)) continue;
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(m[0])) continue;
      add('hex', m.index, m[0]);
    }
  }
  for (const { css, offset } of cssBlocks(file, src)) {
    for (const h of hoverOutsideMedia(css)) add('hover', offset + h.idx, h.sel);
    for (const m of css.matchAll(/border-radius\s*:\s*([^;}]+)/g)) {
      const v = m[1].trim();
      if (/var\(|^0\b|^2px|^50%|^999|inherit/.test(v)) continue;
      add('radius', offset + m.index, `border-radius: ${v}`);
    }
    if (!isTokens) {
      for (const m of css.matchAll(/(?<![-\w])font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) add('fontSize', offset + m.index, m[0]);
      for (const m of css.matchAll(/(?<![-\w])height\s*:\s*(\d{3,})px/g)) add('fixedHeight', offset + m.index, m[0]);
    }
  }
  for (const m of src.matchAll(/\brounded-(full|\[\d+px\])/g)) add('radius', m.index, m[0]);
  for (const m of src.matchAll(/(?<![\w-])(?:min-)?h-\[(\d{3,})px\]/g)) add('fixedHeight', m.index, m[0]);
  for (const m of src.matchAll(/\b100vh\b/g)) add('vh', m.index, '100vh');
  if (!isTokens) for (const m of src.matchAll(/\btext-\[(\d+)px\]/g)) add('fontSize', m.index, m[0]);
}

let total = 0;
for (const [, r] of Object.entries(rules)) {
  total += r.hits.length;
  console.log(`${r.hits.length.toString().padStart(4)}  ${r.title}`);
  if (VERBOSE || STRICT) for (const h of r.hits) console.log(`        ${h}`);
}
console.log(`\nВсего: ${total}${STRICT ? '' : ' (режим предупреждений; подробно: --verbose)'}`);
if (STRICT && total) process.exit(1);
