// Снимок участка страницы: node docs/design/scripts/clip.mjs <файл.png> <ширина> <адрес> <y> <высота>
// node clip.mjs <out> <width> <path> <y> <h>
import { chromium } from 'playwright';
const [out, w, p, y, h] = process.argv.slice(2);
const b = await chromium.launch();
const page = await b.newPage({ viewport: { width: +w, height: 900 } });
await page.addInitScript(() => { try { localStorage.setItem('gr-cookie-consent', 'necessary'); } catch {} });
await page.goto('http://localhost:4321' + p, { waitUntil: 'networkidle' });
await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 700) { window.scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 50)); } window.scrollTo({ top: 0, behavior: 'instant' }); });
await page.waitForTimeout(1200);
await page.screenshot({ path: out, fullPage: true, clip: { x: 0, y: +y, width: +w, height: +h } });
await b.close();
