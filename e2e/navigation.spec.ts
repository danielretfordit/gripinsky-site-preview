import { test, expect } from '@playwright/test';
import { noCookieBanner, collectErrors, expectIslandsHydrated, waitScrollEnd, isMobile } from './helpers';

// Шапка, мобильное меню, подвал и хлебные крошки: переходы между страницами
test.beforeEach(async ({ page }) => { await noCookieBanner(page); });

test.describe('мобильное меню', () => {
  test.beforeEach(async ({ page }) => { test.skip(!isMobile(page), 'меню-гамбургер только до 768'); });

  test('открыть, закрыть кнопкой и Esc, фокус возвращается на кнопку', async ({ page }) => {
    await page.goto('/courses-page/visualization');
    const btn = page.getByRole('button', { name: 'Открыть меню' });
    const menu = page.locator('#mobile-menu');
    await expect(menu).toBeHidden();
    await btn.click();
    await expect(menu).toBeVisible();
    await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#menu-toggle')).toHaveAccessibleName('Закрыть меню');
    await page.locator('#menu-toggle').click();
    await expect(menu).toBeHidden();
    await expect(page.locator('#menu-toggle')).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#menu-toggle').click();
    await expect(menu).toBeVisible();
    await menu.getByRole('link').first().focus();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.locator('#menu-toggle')).toBeFocused();
  });

  test('ссылки меню ведут на свои страницы', async ({ page }) => {
    await page.goto('/');
    const links = await page.locator('#mobile-menu nav a').evaluateAll((as) => as.map((a) => [a.textContent!.trim(), a.getAttribute('href')!]));
    expect(links.length).toBeGreaterThanOrEqual(5);
    for (const [label, href] of links) {
      await page.goto('/');
      await page.locator('#menu-toggle').click();
      await page.locator('#mobile-menu').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Текущий раздел отмечен в меню (меню открывается скриптом, ждём загрузку страницы)
      await page.waitForLoadState('load');
      await page.locator('#menu-toggle').click();
      await expect(page.locator('#mobile-menu').getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('«Бесплатная консультация» в меню закрывает меню и ведёт к форме', async ({ page }) => {
    await page.goto('/blog');
    await page.locator('#menu-toggle').click();
    await page.locator('#mobile-menu').getByRole('link', { name: 'Бесплатная консультация' }).click();
    await expect(page.locator('#mobile-menu')).toBeHidden();
    await waitScrollEnd(page);
    await expect(page.locator('#consult-title')).toBeInViewport();
  });
});

test.describe('шапка, подвал, крошки', () => {
  test('ссылки шапки на планшете и компьютере', async ({ page }) => {
    test.skip(isMobile(page), 'на телефоне меню');
    await page.goto('/');
    const nav = page.getByRole('navigation', { name: 'Основное меню' });
    for (const label of ['3D-визуализация', 'Все курсы', 'Работы учеников', 'Отзывы', 'Блог']) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('navigation', { name: 'Основное меню' }).getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    }
    await page.getByRole('link', { name: /на главную/ }).first().click();
    await expect(page).toHaveURL(/\/$/);
  });

  test('ссылки подвала ведут на живые страницы', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('/');
    const links = await page.locator('#site-footer nav a[href^="/"]').evaluateAll((as) => as.map((a) => [a.textContent!.trim(), a.getAttribute('href')!]));
    expect(links.length).toBeGreaterThan(8);
    for (const [label, href] of links) {
      await page.goto('/oferta');
      await page.locator('#site-footer').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByRole('heading', { level: 1 })).not.toContainText('Такой страницы');
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('хлебные крошки: каждая ссылка ведёт вверх по разделам', async ({ page }) => {
    await page.goto('/interiorpro');
    const crumbs = page.getByRole('navigation', { name: 'Хлебные крошки' });
    await expect(crumbs.locator('[aria-current="page"]')).toHaveText('Интерьерная визуализация PRO');
    await crumbs.getByRole('link', { name: '3D-визуализация' }).click();
    await expect(page).toHaveURL(/\/courses-page\/visualization$/);
    await expectIslandsHydrated(page);
    await page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('link', { name: 'Курсы' }).click();
    await expect(page).toHaveURL(/\/courses$/);
    await page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('link', { name: 'Главная' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/stories/bolshunova');
    await page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('link', { name: 'Отзывы и истории' }).click();
    await expect(page).toHaveURL(/\/otzyvy$/);
    await page.goto('/blog/kompyuter-dlya-3ds-max-i-corona');
    await page.getByRole('navigation', { name: 'Хлебные крошки' }).getByRole('link', { name: 'Блог' }).click();
    await expect(page).toHaveURL(/\/blog$/);
  });

  test('карточки ведут на свои страницы: направление, курс, статья, история', async ({ page }) => {
    await page.goto('/');
    await page.locator('#directions').getByRole('link', { name: '3D-визуализация' }).click();
    await expect(page).toHaveURL(/\/courses-page\/visualization$/);
    await page.goto('/courses');
    const first = page.locator('[data-grid] article a').first();
    const href = await first.getAttribute('href');
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await page.goto('/blog');
    await page.locator('main h2 a').first().click();
    await expect(page).toHaveURL(/\/blog\/.+/);
    await page.goto('/otzyvy');
    await page.locator('main article h3 a').first().click();
    await expect(page).toHaveURL(/\/stories\/.+/);
  });

  test('на страницах без формы консультации ссылка «Бесплатная консультация» ведёт к форме на главной', async ({ page }) => {
    await page.goto('/oferta');
    await expect(page.locator('#consult')).toHaveCount(0);
    await page.locator('#site-footer').getByRole('link', { name: 'Бесплатная консультация' }).click();
    await expect(page).toHaveURL(/\/#consult$/);
    await waitScrollEnd(page);
    await expect(page.locator('#consult-title')).toBeInViewport();
  });

  test('редирект /courses-page на /courses', async ({ page }) => {
    const res = await page.goto('/courses-page');
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(/\/courses$/);
  });
});
