import { test, expect } from '@playwright/test';
import { noCookieBanner } from './helpers';
for (const view of ['results', 'process']) {
  test(`обложки ${view}: изображения, переключение, адаптив`, async ({ page }) => {
    await noCookieBanner(page);
    await page.goto(`/design/course-covers/${view}`);
    await expect(page.locator('.cover-grid article')).toHaveCount(3);
    await expect(page.locator('.model-half')).toHaveCount(view === 'process' ? 3 : 0);
    await expect(page.locator('.cover-new')).toHaveText('Новый курс');
    await page.locator('.cover-grid').scrollIntoViewIfNeeded();
    await expect.poll(() => page.locator('.cover-grid img').evaluateAll((imgs) => imgs.every((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0))).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `docs/design/shots/covers-${view}-${page.viewportSize()!.width}.png` });
    const next = view === 'process' ? 'A. Результат' : 'B. Процесс';
    await page.getByRole('link', { name: next, exact: true }).click();
    await expect(page.getByRole('link', { name: next, exact: true })).toHaveAttribute('aria-current', 'page');
  });
}
