import { test, expect } from '@playwright/test';
import { noCookieBanner, expectIslandsHydrated } from './helpers';

test('логотип шапки и подвала получает PNG для Retina', async ({ browser }, testInfo) => {
  const context = await browser.newContext({ viewport: testInfo.project.use.viewport, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await noCookieBanner(page);
  await page.goto('http://127.0.0.1:4321/courses');
  await expectIslandsHydrated(page);
  for (const selector of ['header img[alt="GRIPINSKY"]', 'footer img[alt="GRIPINSKY"]']) {
    const img = page.locator(selector);
    await img.scrollIntoViewIfNeeded();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
    const data = await img.evaluate((el: HTMLImageElement) => ({ src: el.currentSrc, set: el.srcset, width: el.getBoundingClientRect().width, height: el.getBoundingClientRect().height, dpr: devicePixelRatio }));
    expect(data.set).toContain('2x');
    expect(data.set).toContain('4x');
    const response = await page.request.get(data.src);
    const bytes = await response.body();
    expect(bytes.subarray(1, 4).toString()).toBe('PNG');
    expect(bytes.readUInt32BE(16)).toBeGreaterThanOrEqual(Math.floor(data.width * data.dpr));
    expect(bytes.readUInt32BE(20)).toBeGreaterThanOrEqual(Math.floor(data.height * data.dpr));
  }
  await page.locator('header').scrollIntoViewIfNeeded();
  await page.locator('header').screenshot({ path: `docs/design/shots/logo-retina-${page.viewportSize()!.width}.png` });
  await context.close();
});
