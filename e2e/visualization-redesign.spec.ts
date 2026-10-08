import { test, expect } from '@playwright/test';
for (const route of ['/courses-page/visualization', '/design/visualization/gallery', '/design/visualization/catalog', '/design/visualization/journey']) {
  test(`новая структура и корзина ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(route);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('#path')).toContainText('Начинаю с нуля');
    await expect(page.locator('#path')).toContainText('Уже работаю в 3D');
    await expect(page.locator('#profession [data-course]')).toHaveCount(3);
    await expect(page.locator('#package')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('button', { name: 'Добавить базу в корзину', exact: true }).click();
    await expect(page.locator('[data-cart-dialog]')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('шапка и фоторамка направления совпадают с главной', async ({ page }) => {
  const measure = async () => page.evaluate(() => Object.fromEntries([
    '.global-site-header', '.site-header__inner', '.site-header__brand img',
    '.site-header__consult', '.hero__image',
  ].map(selector => {
    const el = document.querySelector(selector)!;
    const rect = el.getBoundingClientRect();
    const css = getComputedStyle(el);
    return [selector, { width: rect.width, height: rect.height, font: css.fontFamily,
      size: css.fontSize, weight: css.fontWeight, position: css.position }];
  })));
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const home = await measure();
  await page.goto('/courses-page/visualization');
  await page.evaluate(() => document.fonts.ready);
  expect(await measure()).toEqual(home);
});
