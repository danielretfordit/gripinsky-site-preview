// Скриншоты прототипов /design/a|b|c и проверка текстов по правилам брифа.
// node docs/design/scripts/proto-shots.mjs [a,b,c] [--widths=375,1440]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { prepare, hideFixedBottom } from './audit-lib.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const OUT = 'docs/design/shots';
mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const variants = (args.find((a) => !a.startsWith('--')) ?? 'a,b,c').split(',');
const widths = (args.find((a) => a.startsWith('--widths='))?.split('=')[1] ?? '375,1440').split(',').map(Number);
const HEIGHT = { 375: 812, 768: 1024, 1024: 768, 1440: 900 };

// Те же правила, что в scripts/lint-copy.mjs (ссылки и цитаты не проверяем)
const RULES = [[/\s[—–]\s/, 'тире с пробелами'], [/·/, '«·»'], [/→/, '«→» вне ссылки'], [/\bдиплом/i, '«диплом»'], [/налогов\S* вычет/i, 'вычет'], [/гаранти\S* трудоустр/i, 'гарантия']];

const browser = await chromium.launch();
for (const v of variants) {
  for (const w of widths) {
    const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHT[w] }, isMobile: w < 768, hasTouch: w < 768 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await prepare(page, `${BASE}/design/${v}`);
    if (w === widths[0]) {
      const bad = await page.evaluate((rules) => {
        const main = document.querySelector('main').cloneNode(true);
        main.querySelectorAll('a, blockquote, .t-hand, script, style, button').forEach((n) => n.remove());
        const lines = main.innerText.split('\n');
        return rules.flatMap(([re, msg]) => lines.filter((l) => new RegExp(re).test(l)).map((l) => `${msg}: ${l.trim().slice(0, 90)}`));
      }, RULES.map(([re, m]) => [re.source, m]));
      console.log(`[${v}] проверка текстов: ${bad.length ? bad.join(' | ') : 'чисто'}`);
    }
    const m = await page.evaluate(() => ({ h: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth > innerWidth }));
    console.log(`[${v}] ${w}: высота ${m.h}, экранов ${(m.h / innerHeightOf(w)).toFixed(1)}, горизонтальный скролл: ${m.overflow ? 'ЕСТЬ' : 'нет'}${errors.length ? ', ошибки JS: ' + errors.join('; ') : ''}`);
    if (w >= 1024) await page.screenshot({ path: `${OUT}/proto-${v}-${w}-first.png` });
    await hideFixedBottom(page, true);
    await page.screenshot({ path: `${OUT}/proto-${v}-${w}-full.png`, fullPage: true });
    await ctx.close();
  }
}
await browser.close();
function innerHeightOf(w) { return HEIGHT[w]; }
