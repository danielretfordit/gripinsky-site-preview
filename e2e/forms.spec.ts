import { test, expect, type Page } from '@playwright/test';
import { noCookieBanner, collectErrors, expectIslandsHydrated, waitScrollEnd, coveredBy } from './helpers';

// Формы и покупка: «Купить курс», тарифы /ai, форма консультации, cookie-баннер.
// Сервер в пилоте работает в демо-режиме (CHECKOUT_MODE=demo, без вебхука Битрикс24): заявки только пишутся в лог.
const num = (s: string | null) => Number((s ?? '').replace(/[^\d]/g, ''));

test.describe('покупка курса', () => {
  let errors: string[];
  test.beforeEach(async ({ page }) => { await noCookieBanner(page); errors = collectErrors(page); });
  test.afterEach(async () => { expect(errors, errors.join('\n')).toEqual([]); });

  for (const path of ['/interiorpro', '/exteriorpro', '/modeling1', '/1-2-3lvl']) {
    test(`${path}: «Купить курс» открывает оформление с ценой курса и отправляется`, async ({ page }) => {
      await page.goto(path);
      await expectIslandsHydrated(page);
      const aside = page.getByRole('complementary', { name: 'Стоимость' });
      const price = num(await aside.locator('span.text-\\[34px\\]').first().textContent());
      await aside.getByRole('button', { name: 'Купить курс' }).click();
      const dlg = page.getByRole('dialog', { name: 'Оформление курса' });
      await expect(dlg).toBeVisible();
      expect(num(await dlg.locator('b.text-\\[22px\\]').textContent())).toBe(price);
      await dlg.getByLabel('Имя и фамилия').fill('Автотест Playwright');
      await dlg.getByLabel('Почта (для доступа к курсам)').fill('autotest@example.com');
      await dlg.getByLabel('Телефон').fill('+7 900 000-00-00');
      await dlg.locator('label', { hasText: 'Даю согласие' }).locator('.check-box').click();
      const [res] = await Promise.all([
        page.waitForResponse('**/api/checkout'),
        dlg.getByRole('button', { name: 'Перейти к оплате' }).click(),
      ]);
      const out = await res.json();
      expect(out).toMatchObject({ ok: true, mode: 'demo', total: price });
      await expect(page.getByRole('dialog', { name: 'Заявка принята' })).toBeVisible();
    });
  }

  test('«Купить курс» нажали до загрузки диалога: оформление всё равно открывается', async ({ page }) => {
    test.skip(!!process.env.BASE_URL && !process.env.BASE_URL.includes(':4321'), 'задержку загрузки острова можно смоделировать только на dev-сервере (в сборке у файлов хэши)');
    // Задерживаем загрузку острова оформления, как на медленном телефоне
    await page.route(/\/src\/islands\/Checkout\.tsx/, async (route) => { await new Promise((r) => setTimeout(r, 2500)); await route.continue(); });
    await page.goto('/interiorpro', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.readyState === 'complete' || document.readyState === 'interactive');
    await page.waitForTimeout(500);
    await expect(page.locator('astro-island[ssr]')).toHaveCount(1);
    await page.getByRole('button', { name: 'Купить курс' }).click();
    await expect(page.getByRole('dialog', { name: 'Оформление курса' })).toBeVisible({ timeout: 15_000 });
  });

  test('бесплатный мини-курс: кнопка «Получить доступ» ведёт в Telegram', async ({ page }) => {
    await page.goto('/vizualization3_mini');
    const a = page.getByRole('complementary', { name: 'Стоимость' }).getByRole('link', { name: 'Получить доступ' });
    await expect(a).toHaveAttribute('href', /^https:\/\/t\.me\//);
  });

  test('/uslugi_nastavnik: страница услуги открывается, оформление работает', async ({ page }) => {
    await page.goto('/uslugi_nastavnik');
    await expectIslandsHydrated(page);
    const buy = page.getByRole('button', { name: 'Купить курс' });
    if (await buy.count()) {
      await buy.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toBeHidden();
    }
  });

  test('/ai: оба тарифа открывают оформление со своей ценой', async ({ page }) => {
    await page.goto('/ai');
    await expectIslandsHydrated(page);
    await page.getByRole('link', { name: /Выбрать тариф/ }).click();
    await waitScrollEnd(page);
    await expect(page.locator('#tariffs-title')).toBeInViewport();
    const cards = page.locator('#tariffs article');
    for (let i = 0; i < 2; i++) {
      const price = num(await cards.nth(i).locator('b.text-\\[34px\\]').textContent());
      await cards.nth(i).getByRole('button').click();
      const dlg = page.getByRole('dialog', { name: 'Оформление курса' });
      await expect(dlg).toBeVisible();
      expect(num(await dlg.locator('b.text-\\[22px\\]').textContent())).toBe(price);
      await dlg.getByRole('button', { name: 'Закрыть' }).click();
      await expect(dlg).toBeHidden();
    }
    // Слайдер на /ai
    const input = page.locator('[data-ba] input');
    await input.focus();
    await page.keyboard.press('End');
    await expect(input).toHaveValue('100');
  });
});

test.describe('FAQ', () => {
  test.beforeEach(async ({ page }) => { await noCookieBanner(page); });
  for (const path of ['/courses-page/visualization', '/', '/ai', '/courses-page/interior']) {
    test(`${path}: вопросы открываются и закрываются, страница не прыгает`, async ({ page }) => {
      await page.goto(path);
      const items = page.locator('details.faq');
      const n = await items.count();
      expect(n).toBeGreaterThan(2);
      for (let i = 0; i < Math.min(n, 4); i++) {
        const d = items.nth(i);
        const summary = d.locator('summary');
        await summary.scrollIntoViewIfNeeded();
        const top0 = await summary.evaluate((el) => el.getBoundingClientRect().top);
        await summary.click();
        await expect(d).toHaveAttribute('open', '');
        await expect(d.locator('> :not(summary)').first()).toBeVisible();
        expect(Math.abs((await summary.evaluate((el) => el.getBoundingClientRect().top)) - top0)).toBeLessThanOrEqual(1);
        await summary.click();
        await expect(d).not.toHaveAttribute('open', '');
        expect(Math.abs((await summary.evaluate((el) => el.getBoundingClientRect().top)) - top0)).toBeLessThanOrEqual(1);
      }
      // С клавиатуры: Enter на вопросе
      const s = items.first().locator('summary');
      await s.focus();
      await page.keyboard.press('Enter');
      await expect(items.first()).toHaveAttribute('open', '');
    });
  }
});

test.describe('форма консультации', () => {
  test.beforeEach(async ({ page }) => { await noCookieBanner(page); });

  async function form(page: Page, path: string) {
    await page.goto(path);
    const f = page.locator('#consult form');
    await f.scrollIntoViewIfNeeded();
    return f;
  }

  test('валидация: ошибки, фокус на первом поле с ошибкой, согласие', async ({ page }) => {
    const f = await form(page, '/courses-page/visualization');
    const send = f.getByRole('button', { name: 'Записаться на консультацию' });
    await send.click();
    await expect(f.getByText('Напишите имя')).toBeVisible();
    await expect(f.getByText('Оставьте телефон или ник')).toBeVisible();
    await expect(f.getByText('Нужно согласие')).toBeVisible();
    await expect(f.getByLabel('Как к вам обращаться')).toBeFocused();
    await expect(f.getByLabel('Как к вам обращаться')).toHaveAttribute('aria-invalid', 'true');
    await f.getByLabel('Как к вам обращаться').fill('Автотест');
    await send.click();
    await expect(f.getByText('Напишите имя')).toBeHidden();
    await expect(f.getByLabel('Телефон или ник в Telegram')).toBeFocused();
    await f.getByLabel('Телефон или ник в Telegram').fill('@autotest');
    await send.click();
    await expect(f.getByText('Нужно согласие')).toBeVisible();
    await expect(f.getByRole('checkbox')).toBeFocused();
    // Галочка ставится кликом по подписи и пробелом
    await f.locator('label', { hasText: 'Даю согласие' }).locator('.check-box').click();
    await expect(f.getByRole('checkbox')).toBeChecked();
    await page.keyboard.press('Space');
    await expect(f.getByRole('checkbox')).not.toBeChecked();
    await page.keyboard.press('Space');
    await expect(f.getByRole('checkbox')).toBeChecked();
  });

  test('отправка в демо-режиме: спасибо, данные пакета и теста уходят в заявку', async ({ page }) => {
    const f = await form(page, '/courses-page/visualization');
    await expectIslandsHydrated(page);
    await f.getByLabel('Как к вам обращаться').fill('Автотест Playwright');
    await f.getByLabel('Телефон или ник в Telegram').fill('@autotest');
    await f.locator('label', { hasText: 'Даю согласие' }).locator('.check-box').click();
    const [req, res] = await Promise.all([
      page.waitForRequest('**/api/lead'),
      page.waitForResponse('**/api/lead'),
      f.getByRole('button', { name: 'Записаться на консультацию' }).click(),
    ]);
    expect(req.postData()).toContain('Автотест Playwright');
    expect(req.postData()).toContain('Направление 3D-визуализация');
    expect(req.postData()).toContain('итого');
    expect(await res.json()).toMatchObject({ ok: true });
    await expect(f.getByText('Спасибо! Заявка принята')).toBeVisible();
    await expect(f.locator('.lead-status')).toBeFocused();
    await expect(f.getByRole('button', { name: 'Записаться на консультацию' })).toBeHidden();
  });

  test('ссылка на согласие в подписи галочки открывается в новой вкладке, заполненная форма не теряется', async ({ page, context }) => {
    const f = await form(page, '/courses-page/visualization');
    await f.getByLabel('Как к вам обращаться').fill('Автотест');
    const [tab] = await Promise.all([
      context.waitForEvent('page'),
      f.getByRole('link', { name: 'согласие на обработку персональных данных' }).click(),
    ]);
    await tab.waitForLoadState();
    expect(tab.url()).toMatch(/\/soglasie$/);
    await tab.close();
    await expect(page).toHaveURL(/\/courses-page\/visualization/);
    await expect(f.getByLabel('Как к вам обращаться')).toHaveValue('Автотест');
  });

  test('ошибка сервера: сообщение и кнопка снова активна', async ({ page }) => {
    const f = await form(page, '/');
    await page.route('**/api/lead', (r) => r.fulfill({ status: 502, body: '{"ok":false}', contentType: 'application/json' }));
    await f.getByLabel('Как к вам обращаться').fill('Автотест');
    await f.getByLabel('Телефон или ник в Telegram').fill('@autotest');
    await f.locator('label', { hasText: 'Даю согласие' }).locator('.check-box').click();
    await f.getByRole('button', { name: 'Записаться на консультацию' }).click();
    await expect(f.getByText('Не получилось отправить заявку')).toBeVisible();
    await expect(f.getByRole('button', { name: 'Записаться на консультацию' })).toBeEnabled();
  });

  test('ссылка «Бесплатная консультация» в шапке ведёт к форме', async ({ page }) => {
    await page.goto('/interiorpro');
    test.skip(page.viewportSize()!.width < 1024, 'в шапке только с 1024, на телефоне проверяется в меню');
    await page.getByRole('banner').getByRole('link', { name: /консультация/i }).click();
    await waitScrollEnd(page);
    await expect(page.locator('#consult-title')).toBeInViewport();
  });
});

test.describe('cookie-баннер', () => {
  for (const [label, value] of [['Разрешить', 'all'], ['Только необходимые', 'necessary']] as const) {
    test(`«${label}» закрывает баннер и запоминает выбор`, async ({ page }) => {
      await page.goto('/');
      const banner = page.getByRole('region', { name: 'Использование cookie' });
      await expect(banner).toBeVisible();
      await banner.getByRole('button', { name: label }).click();
      await expect(banner).toBeHidden();
      expect(await page.evaluate(() => localStorage.getItem('gr-cookie-consent'))).toBe(value);
      await page.reload();
      await expect(banner).toBeHidden();
    });
  }

  test('баннер не перекрывает липкую панель пакета: «Оформить» нажимается', async ({ page }) => {
    await page.goto('/courses-page/visualization');
    await expectIslandsHydrated(page);
    const banner = page.getByRole('region', { name: 'Использование cookie' });
    await expect(banner).toBeVisible();
    await page.evaluate(() => {
      const h = document.getElementById('profession-title')!;
      window.scrollTo({ top: h.getBoundingClientRect().bottom + window.scrollY + 40, behavior: 'instant' });
    });
    const bar = page.locator('astro-island [aria-hidden="false"]').filter({ hasText: 'Ваш пакет' });
    await expect(bar).toBeVisible();
    await page.waitForTimeout(400); // панель выезжает с анимацией
    const btn = bar.getByRole('button', { name: 'Оформить' });
    expect(await coveredBy(btn), 'кнопку «Оформить» закрывает баннер').toBeNull();
    expect(await coveredBy(banner.getByRole('button', { name: 'Разрешить' })), 'баннер закрыт панелью').toBeNull();
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });
});
