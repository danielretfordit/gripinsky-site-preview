import { chromium } from '@playwright/test';
const browser = await chromium.launch();
const page = await browser.newPage({ reducedMotion: 'reduce' });
for (const route of ['/', '/courses-page/visualization']) {
  for (const width of [375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(`http://127.0.0.1:4323${route}`, { waitUntil: 'networkidle' });
    const slides = page.locator('[data-hero-slide]');
    if (await slides.count() !== 17) throw Error(`${route}: expected 17 covers`);
    if (await page.evaluate(() => document.documentElement.scrollWidth) > width + 1) throw Error('Horizontal overflow');
    for (let i = 0; i < 17; i++) {
      const active = page.locator('[data-hero-slide][data-active]');
      await active.locator('img').evaluate(img => img.decode());
      if (!(await active.locator('figcaption').textContent())?.trim()) throw Error('Missing caption');
      if ((await page.locator('[data-hero-count]').textContent()).trim() !== `${String(i + 1).padStart(2, '0')} / 17`) throw Error('Counter mismatch');
      await page.locator('[data-hero-next]').click();
    }
    if (await slides.first().getAttribute('data-active') === null) throw Error('Carousel wrap failed');
    if (width === 375 || width === 1440) await page.screenshot({ path: `/private/tmp/hero-covers-${route === '/' ? 'home' : 'course'}-${width}.png` });
  }
}
await browser.close();
console.log('Passed: 17 images decode, captions, arrows, wrap and 8 responsive layouts.');
