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

// ---------- Встроенный браузер Telegram (эмуляция: строка агента и объект TelegramWebviewProxy) ----------
const TG_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.0.0 Mobile Safari/537.36 Telegram-Android/11.2.0';

test.describe('Telegram', () => {
  test.use({ userAgent: TG_UA });
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { (window as unknown as Record<string, unknown>).TelegramWebviewProxy = { postEvent() {} }; });
  });

  test('сайт помечает встроенный браузер и даёт запасной путь к оплате', async ({ page }) => {
    const errors = watch(page);
    await page.unroute('**/api/checkout');
    await page.route('**/api/checkout', (r) => r.fulfill({ json: { ok: true, mode: 'getcourse', total: 10900, redirect: '/oplata/uspeh' } }));
    await page.goto('/courses');
    await hydrated(page);
    await expect(page.locator('html')).toHaveClass(/is-inapp-telegram/);
    await page.locator('[data-cart-add]:not([disabled])').first().click();
    await page.locator('dialog[data-cart-dialog][open]').getByRole('button', { name: 'Оформить пакет' }).click();
    const form = page.locator('dialog[open]').filter({ has: page.locator('input[name="email"]') });
    await form.locator('input[name="name"]').fill('Анна Тестова');
    await form.locator('input[name="email"]').fill('anna@example.com');
    await form.locator('input[name="phone"]').fill('+79991234567');
    await form.getByRole('checkbox').check({ force: true });
    await page.waitForTimeout(2600); // форма не отправляется быстрее, чем её заполнил бы человек
    await form.getByRole('button', { name: 'Перейти к оплате' }).click();
    // После отправки форма сменяется экраном перехода к оплате с запасными путями
    const pay = page.locator('dialog[open]');
    await expect(pay.getByText('Если оплата не открылась')).toBeVisible();
    await expect(pay.getByRole('button', { name: 'Скопировать ссылку' })).toBeVisible();
    await expect(pay.getByRole('link', { name: 'Открыть в браузере' })).toHaveAttribute('href', /^intent:\/\//);
    await page.waitForURL('**/oplata/uspeh');
    expect(errors).toEqual([]);
  });

  test('корзина приходит по ссылке', async ({ page }) => {
    await page.goto('/courses?cart=modeling1,ai,../evil&support=chat');
    await hydrated(page);
    await expect(page.locator('[data-site-cart]')).toBeVisible();
    await expect(page).toHaveURL(/\/courses$/);
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('gripinsky-cart-v1') ?? '{}'));
    expect(saved.ids).toEqual(['modeling1', 'ai']);
  });
});
