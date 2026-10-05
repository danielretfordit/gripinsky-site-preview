// Скриншоты стилевых направлений /design/style-N и обзорная картинка styles-overview.png.
// node docs/design/scripts/style-shots.mjs [1,2,3,4] [--no-overview]
import { chromium } from 'playwright';
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { prepare, hideFixedBottom } from './audit-lib.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const OUT = 'docs/design/shots';
const TMP = `${OUT}/_tmp`;
mkdirSync(TMP, { recursive: true });
const args = process.argv.slice(2);
const list = (args.find((a) => !a.startsWith('--')) ?? '1,2,3,4').split(',');
const RULES = [[/\s[—–]\s/.source, 'тире с пробелами'], [/·/.source, '«·»'], [/→/.source, '«→» вне ссылки']];

const browser = await chromium.launch();
for (const n of list) {
  for (const w of [1440, 375]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: w === 375 ? 812 : 900 }, isMobile: w < 768, hasTouch: w < 768 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await prepare(page, `${BASE}/design/style-${n}`);
    const info = await page.evaluate((rules) => {
      const main = document.querySelector('main').cloneNode(true);
      main.querySelectorAll('a, blockquote, script, style, button').forEach((x) => x.remove());
      const lines = main.innerText.split('\n');
      const bad = rules.flatMap(([re, msg]) => lines.filter((l) => new RegExp(re).test(l)).map((l) => `${msg}: ${l.trim().slice(0, 80)}`));
      const fonts = [...new Set([...document.querySelectorAll('.sp h1, .sp h2, .sp p, .sp .sp-label')].map((e) => getComputedStyle(e).fontFamily.split(',')[0]))];
      const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
      return { h: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth > innerWidth, bad, fonts, loaded: [...new Set(loaded)] };
    }, RULES);
    console.log(`[style-${n}] ${w}: высота ${info.h}, скролл вбок: ${info.overflow ? 'ЕСТЬ' : 'нет'}, тексты: ${info.bad.length ? info.bad.join(' | ') : 'чисто'}${errors.length ? ', JS: ' + errors.join('; ') : ''}`);
    if (w === 1440) console.log(`   шрифты: ${info.fonts.join(', ')}; загружены: ${info.loaded.join(', ')}`);
    if (w === 1440) {
      await hideFixedBottom(page, true);
      await page.screenshot({ path: `${OUT}/style-${n}-1440-first.png` });
      const core = await page.$('#tile-core');
      if (core) await core.screenshot({ path: `${TMP}/tile-${n}.png` });
    }
    await hideFixedBottom(page, true);
    await page.screenshot({ path: `${OUT}/style-${n}-${w}-full.png`, fullPage: true });
    await ctx.close();
  }
}
await browser.close();

if (!args.includes('--no-overview')) {
  // 4 колонки: первый экран + стайл-тайл (палитра и шрифты)
  const COL = 700, GAP = 24, PAD = 32, LAB = 56;
  const names = ['1. Графит и сигнал (лайм как сигнал)', '2. Белая стена (новая светлая палитра)', '3. Бирюза и латунь (фон бренда, без лайма)', '4. Тёплая студия (новая тёплая палитра)'];
  const cols = [];
  for (const n of ['1', '2', '3', '4']) {
    const first = await sharp(`${OUT}/style-${n}-1440-first.png`).resize(COL).toBuffer();
    const tile = await sharp(`${TMP}/tile-${n}.png`).resize(COL).toBuffer();
    const fh = (await sharp(first).metadata()).height, th = (await sharp(tile).metadata()).height;
    cols.push({ first, tile, fh, th });
  }
  const H = PAD * 2 + LAB + Math.max(...cols.map((c) => c.fh + c.th + GAP));
  const W = PAD * 2 + cols.length * COL + (cols.length - 1) * GAP;
  const label = (t) => Buffer.from(`<svg width="${COL}" height="${LAB}"><text x="0" y="34" font-size="26" font-weight="700" font-family="Helvetica, Arial, sans-serif" fill="#ffffff">${t}</text></svg>`);
  const parts = cols.flatMap((c, i) => [
    { input: label(names[i]), left: PAD + i * (COL + GAP), top: PAD },
    { input: c.first, left: PAD + i * (COL + GAP), top: PAD + LAB },
    { input: c.tile, left: PAD + i * (COL + GAP), top: PAD + LAB + c.fh + GAP },
  ]);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#2b2b2b' } }).composite(parts).png().toFile(`${OUT}/styles-overview.png`);
  console.log('обзор:', `${OUT}/styles-overview.png`, W, 'x', H);
}
