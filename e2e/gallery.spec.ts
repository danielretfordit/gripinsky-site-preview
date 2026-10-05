import { test, expect, type Page } from '@playwright/test';
import { noCookieBanner, collectErrors, expectNoBrokenImages } from './helpers';

// Галерея: фильтры и лайтбокс (клик, стрелки, кнопки, свайп, Esc, возврат фокуса)
let errors: string[];
test.beforeEach(async ({ page }) => {
  await noCookieBanner(page);
  errors = collectErrors(page);
  await page.goto('/gallery');
});
test.afterEach(async () => { expect(errors, errors.join('\n')).toEqual([]); });

const lb = (page: Page) => page.locator('#lightbox');
const count = (page: Page) => page.locator('[data-lb-count]');

test('фильтры: число работ совпадает со счётчиком на кнопке', async ({ page }) => {
  const buttons = page.locator('[data-gallery-filters] button');
  for (let i = (await buttons.count()) - 1; i >= 0; i--) {
    const b = buttons.nth(i);
    const n = Number(((await b.locator('span').textContent()) ?? '').replace(/\D/g, ''));
    await b.click();
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-gallery] li:visible')).toHaveCount(n);
  }
  expect(await page.evaluate(() => window.scrollX)).toBe(0);
});

test('лайтбокс: клик, стрелки клавиатуры, кнопки, Esc и возврат фокуса', async ({ page }) => {
  const opener = page.locator('[data-gallery] li button').nth(2);
  await opener.scrollIntoViewIfNeeded();
  const y0 = await page.evaluate(() => window.scrollY);
  await opener.click();
  await expect(lb(page)).toBeVisible();
  const total = Number(((await count(page).textContent()) ?? '').split('из')[1].trim());
  await expect(count(page)).toHaveText(`3 из ${total}`);
  await expectNoBrokenImages(page, lb(page));
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).overflow)).toBe('hidden');
  await page.keyboard.press('ArrowRight');
  await expect(count(page)).toHaveText(`4 из ${total}`);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await expect(count(page)).toHaveText(`2 из ${total}`);
  await lb(page).getByRole('button', { name: 'Следующая работа' }).click();
  await expect(count(page)).toHaveText(`3 из ${total}`);
  await lb(page).getByRole('button', { name: 'Предыдущая работа' }).click();
  await lb(page).getByRole('button', { name: 'Предыдущая работа' }).click();
  await lb(page).getByRole('button', { name: 'Предыдущая работа' }).click();
  await expect(count(page)).toHaveText(`${total} из ${total}`);
  await page.keyboard.press('Escape');
  await expect(lb(page)).toBeHidden();
  await expect(opener).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  expect(Math.abs((await page.evaluate(() => window.scrollY)) - y0)).toBeLessThanOrEqual(2);
});

test('лайтбокс: закрытие крестиком и кликом по фону', async ({ page }) => {
  const opener = page.locator('[data-gallery] li button').first();
  await opener.click();
  await lb(page).getByRole('button', { name: 'Закрыть' }).click();
  await expect(lb(page)).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(lb(page)).toBeVisible();
  // Пустое место вокруг картинки
  const vp = page.viewportSize()!;
  await page.mouse.click(vp.width / 2, vp.height - 8);
  await expect(lb(page)).toBeHidden();
});

test('лайтбокс после фильтра листает только отфильтрованные работы', async ({ page }) => {
  const b = page.locator('[data-gallery-filters] button', { hasText: 'Экстерьеры' });
  const n = Number(((await b.locator('span').textContent()) ?? '').replace(/\D/g, ''));
  await b.click();
  await page.locator('[data-gallery] li:visible button').first().click();
  await expect(count(page)).toHaveText(`1 из ${n}`);
  await page.keyboard.press('ArrowLeft');
  await expect(count(page)).toHaveText(`${n} из ${n}`);
});

test('лайтбокс: свайп пальцем', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'тач через CDP только в Chromium');
  await page.locator('[data-gallery] li button').first().click();
  const total = Number(((await count(page).textContent()) ?? '').split('из')[1].trim());
  const cdp = await page.context().newCDPSession(page);
  const vp = page.viewportSize()!;
  const y = vp.height / 2;
  const swipe = async (from: number, to: number) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from, y }] });
    for (let k = 1; k <= 5; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from + ((to - from) * k) / 5, y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await swipe(vp.width * 0.8, vp.width * 0.2);
  await expect(count(page)).toHaveText(`2 из ${total}`);
  await swipe(vp.width * 0.2, vp.width * 0.8);
  await expect(count(page)).toHaveText(`1 из ${total}`);
  // Короткое касание не листает
  await swipe(vp.width * 0.5, vp.width * 0.5 + 10);
  await expect(count(page)).toHaveText(`1 из ${total}`);
});
