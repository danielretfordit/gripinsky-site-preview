// Быстрые снимки страниц для дизайн-ревью: node docs/design/scripts/shot.mjs <папка> <ширина> <адрес>...
// Пример: node docs/design/scripts/shot.mjs /tmp/shots 1440 / /courses-page/visualization
import { chromium } from 'playwright';
const [out, width, ...paths] = process.argv.slice(2);
const base = process.env.BASE_URL ?? 'http://localhost:4321';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => { try { localStorage.setItem('gr-cookie-consent', 'necessary'); } catch {} });
for (const p of paths) {
  const page = await ctx.newPage();
  await page.goto(base + p, { waitUntil: 'networkidle' });
  // Догружаем ленивые картинки
  await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.waitForTimeout(1200);
  const name = (p === '/' ? 'home' : p.replace(/^\//, '').replace(/[/?#=&]/g, '_')) + `-${width}.png`;
  await page.screenshot({ path: `${out}/${name}`, fullPage: !process.env.FIRST });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  console.log(name, h, over ? 'ГОРИЗОНТАЛЬНЫЙ СКРОЛЛ' : '');
  await page.close();
}
await b.close();
