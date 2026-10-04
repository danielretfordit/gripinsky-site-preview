import { test, expect } from '@playwright/test';
import { noCookieBanner, collectErrors, expectNoHorizontalOverflow, expectIslandsHydrated } from './helpers';

const PAGES = ['/', '/courses-page/visualization', '/courses-page/interior', '/courses', '/interiorpro', '/1-2-3lvl', '/ai', '/gallery', '/otzyvy', '/stories/bolshunova', '/blog', '/oferta'];

test.beforeEach(async ({ page }) => { await noCookieBanner(page); });

for (const path of PAGES) {
  test(`страница ${path}: загрузка без ошибок и без горизонтальной прокрутки`, async ({ page }) => {
    const errors = collectErrors(page);
    const res = await page.goto(path);
    expect(res?.status()).toBe(200);
    await expectIslandsHydrated(page);
    await expectNoHorizontalOverflow(page);
    expect(errors, errors.join('\n')).toEqual([]);
  });
}

test('направление: тест, формат, профессия, допы и оформление работают', async ({ page }) => {
  await page.goto('/courses-page/visualization');
  await expectIslandsHydrated(page);
  const total = page.locator('#package-summary [aria-live]').first();
  await expect(total).toContainText('74 800');

  await page.getByRole('button', { name: 'Пройти тест' }).click();
  await page.getByRole('button', { name: 'Никогда' }).click();
  await page.getByRole('button', { name: 'Нет', exact: true }).click();
  await page.getByRole('button', { name: 'Визуализатором экстерьеров и ЖК' }).click();
  await page.getByRole('button', { name: 'С проверкой работ и поддержкой кураторов' }).click();
  await expect(page.getByText('Новичок')).toBeVisible();
  await page.getByRole('button', { name: /Показать пакет и цену/ }).click();
  await expect(total).toContainText('121 700');

  await page.getByRole('radio', { name: /Самостоятельный/ }).click();
  await expect(total).toContainText('106 700');

  await page.getByRole('radio', { name: /Интерьерный визуализатор/ }).click();
  await page.locator('#package label', { hasText: 'Материалы Corona PRO' }).click();
  await expect(total).toContainText('87 700');

  await page.locator('#package-summary').getByRole('button', { name: 'Оформить пакет' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('87 700');
});

test('направление: липкая панель появляется после профессий и прячется у пакета', async ({ page }) => {
  await page.goto('/courses-page/visualization');
  await expectIslandsHydrated(page);
  const bar = page.locator('astro-island [aria-hidden]').filter({ hasText: 'Ваш пакет' }).first();
  await expect(bar).toHaveAttribute('aria-hidden', 'true');
  await page.locator('#money').scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await expect(bar).toHaveAttribute('aria-hidden', 'false');
  await page.locator('#package-summary').scrollIntoViewIfNeeded();
  await expect(bar).toHaveAttribute('aria-hidden', 'true');
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect(bar).toHaveAttribute('aria-hidden', 'true');
});

test('главная: первый вопрос теста кликабелен', async ({ page }) => {
  await page.goto('/');
  await expectIslandsHydrated(page);
  await page.getByRole('button', { name: 'Интерьеры, дома и предметы' }).click();
  await expect(page.getByText('Вопрос 2 из 5')).toBeVisible();
});

test('галерея: фильтр и лайтбокс', async ({ page }) => {
  await page.goto('/gallery');
  await page.getByRole('button', { name: /Работы педагогов/ }).click();
  await page.locator('[data-gallery] li:not([hidden]) button').first().click();
  await expect(page.locator('#lightbox')).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-lb-count]')).toContainText('2 из');
  await page.keyboard.press('Escape');
  await expect(page.locator('#lightbox')).toBeHidden();
});

test('админка Keystatic открывается', async ({ page }) => {
  await page.goto('/keystatic');
  // На телефоне боковое меню админки свёрнуто, поэтому проверяем, что интерфейс отрисовался
  await expect(page.locator('body')).toContainText('Курсы и пакеты', { timeout: 20_000 });
});
