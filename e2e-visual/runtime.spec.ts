import { test, expect, type Page } from '@playwright/test';

// Собранный сайт с боевой политикой содержимого (CSP): острова оживают, ключевые сценарии работают,
// в консоли нет ошибок JavaScript и нарушений CSP. Заявки и оплата подменяются, наружу ничего не уходит.
test.skip(({ viewport }) => ![375, 390, 1440].includes(viewport?.width ?? 0), 'проверяется на телефоне и десктопе');

function watch(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`JS: ${e.message}`));
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' || /Content Security Policy|Refused to/i.test(t)) errors.push(`console: ${t.slice(0, 300)}`);
  });
  return errors;
}

async function hydrated(page: Page) {
  await expect.poll(() => page.locator('astro-island[ssr]').count(), { timeout: 15_000 }).toBe(0);
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => { try { localStorage.setItem('gr-cookie-consent', 'necessary'); } catch {} });
  await page.route('**/api/checkout', (r) => r.fulfill({ json: { ok: true, mode: 'demo', total: 10900 } }));
  await page.route('**/api/lead', (r) => r.fulfill({ json: { ok: true, demo: true } }));
});

test('главная: меню, тест подбора, вкладки без ошибок и нарушений CSP', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/');
  await hydrated(page);
  if (await page.locator('.site-header__menu summary').isVisible()) {
    await page.locator('.site-header__menu summary').click();
    await expect(page.locator('#site-primary-menu')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.locator('#quiz .quiz-choice').first().click();
  await page.locator('#pick-tab-soft').click();
  await expect(page.locator('#pick-soft')).toBeVisible();
  expect(errors).toEqual([]);
});

test('каталог: корзина и оформление без ошибок и нарушений CSP', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/courses');
  await hydrated(page);
  await page.locator('[data-cart-add]:not([disabled])').first().click();
  // После добавления корзина открывается сама; из неё переходим к оформлению
  const cart = page.locator('dialog[data-cart-dialog][open]');
  await expect(cart).toBeVisible();
  await cart.getByRole('button', { name: 'Оформить пакет' }).click();
  await expect(page.locator('dialog[open]').filter({ has: page.locator('input[name="email"]') })).toBeVisible();
  expect(errors).toEqual([]);
});

test('галерея: лайтбокс без ошибок и нарушений CSP', async ({ page }) => {
  const errors = watch(page);
  await page.goto('/gallery');
  await page.locator('button[data-open]').first().click();
  await expect(page.locator('#lightbox')).toBeVisible();
  await page.locator('[data-lb-next]').click();
  await page.locator('[data-lb-close]').click();
  expect(errors).toEqual([]);
});

test('направление и курс: острова оживают без ошибок', async ({ page }) => {
  const errors = watch(page);
  for (const path of ['/courses-page/visualization', '/vizualization3', '/ai', '/courses-page/gamedev']) {
    await page.goto(path);
    await hydrated(page);
  }
  expect(errors).toEqual([]);
});
