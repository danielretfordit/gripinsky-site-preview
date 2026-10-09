// Аудит «слипшегося» текста и ритма на собранном сайте.
// 1) слова без пробела на одной строке (строчная + прописная, знак препинания + буква);
// 2) заголовок или надзаголовок вплотную к следующему блоку.
// Запуск: BASE_URL=http://localhost:4322 node scripts/audit-rhythm.mjs [ширина]
import { chromium } from 'playwright';

const PAGES = ['/', '/courses-page/visualization', '/courses-page/interior', '/courses-page/3ds-max', '/courses', '/vizualization3',
  '/interiorpro', '/ai', '/courses-page/gamedev', '/gallery', '/otzyvy', '/stories/bolshunova', '/club', '/teachers', '/blog',
  '/blog/kompyuter-dlya-3ds-max-i-corona', '/news', '/oferta', '/404'];
const base = process.env.BASE_URL ?? 'http://localhost:4322';
const width = Number(process.argv[2] ?? 1440);
const exe = process.env.PW_CHROMIUM ?? (process.env.CI ? undefined : '/opt/pw-browsers/chromium');
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const ctx = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
await ctx.addInitScript(() => { try { localStorage.setItem('gr-cookie-consent', 'necessary'); } catch {} });
let total = 0;
for (const p of PAGES) {
  const page = await ctx.newPage();
  await page.goto(base + p, { waitUntil: 'networkidle' });
  const found = await page.evaluate(() => {
    const out = [];
    const visible = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
    // 1. Слипшиеся слова: смотрим текст блока так, как его видит читатель
    const blocks = document.querySelectorAll('body :is(p, li, h1, h2, h3, h4, figcaption, dd, dt, a, button, summary, span, b, strong, label, time, div)');
    const seen = new Set();
    for (const el of blocks) {
      if (!visible(el) || el.closest('.sr-only, [aria-hidden="true"], script, style, svg')) continue;
      const t = el.innerText?.trim(); if (!t || t.length > 400) continue;
      for (const line of t.split('\n')) {
        const m = line.match(/[а-яёa-z][А-ЯЁ]|[а-яё][A-Z]|[.!?:;»)][А-ЯЁа-яёA-Za-z«]/);
        if (!m) continue;
        if (/https?:|www\.|@|\.ru|\.com|\d[.,]\d|[A-Za-z]\.[A-Za-z]|GRIPINSKY|iPhone|YouTube|ZBrush|KeyShot|SpeedTree|RailClone|ForestPack|Forest Pack|ArchViz|PRO|3ds|V-Ray|TV/.test(line) && !/[а-яё][А-ЯЁ]/.test(m[0])) continue;
        if (/\b(?:ИИ|3D|ЖК|ТЗ|ПК|ИП|ИНН|ОГРНИП|ВКонтакте|YouTube)\b/.test(line) && /[а-яё][А-ЯЁ]/.test(m[0]) && /ВКонтакте/.test(line)) continue;
        const key = line.slice(0, 80);
        if (seen.has(key)) continue; seen.add(key);
        out.push({ kind: 'слиплось', text: line.slice(Math.max(0, m.index - 30), m.index + 30), tag: el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : '') });
      }
    }
    // 2. Тесно: заголовок или надзаголовок и следующий блок
    for (const h of document.querySelectorAll('main :is(h1, h2, h3, .t-overline, .t-hero, .t-display, .t-h2)')) {
      if (!visible(h) || h.closest('[aria-hidden="true"], .sr-only, summary, button, a')) continue;
      let n = h.nextElementSibling; while (n && !visible(n)) n = n.nextElementSibling;
      if (!n) continue;
      // Подпись-строка над картинкой (как над кадром первого экрана) стоит вплотную намеренно
      if (n.querySelector('img') && !(n.innerText || '').trim()) continue;
      const a = h.getBoundingClientRect(), b = n.getBoundingClientRect();
      if (b.top < a.top + 2 || Math.abs(b.left - a.left) > 40) continue; // не под заголовком
      const gap = Math.round(b.top - a.bottom);
      const isHead = h.matches('h1, .t-hero, .t-display, .t-h2, .t-page-title') || (h.tagName === 'H2' && !h.matches('.t-h3, .t-title'));
      const min = isHead ? 12 : h.matches('.t-overline') ? 8 : 4;
      if (gap < min) out.push({ kind: `тесно ${gap}px`, text: (h.innerText || '').replace(/\s+/g, ' ').slice(0, 50) + ' ⟶ ' + (n.innerText || n.tagName).replace(/\s+/g, ' ').slice(0, 40), tag: h.tagName.toLowerCase() + '.' + String(h.className).split(' ')[0] });
    }
    return out;
  });
  if (found.length) { console.log(`\n${p} (${width})`); for (const f of found) console.log(`  [${f.kind}] ${f.tag}: ${f.text}`); }
  total += found.length;
  await page.close();
}
console.log(`\nВсего замечаний: ${total}`);
await browser.close();
