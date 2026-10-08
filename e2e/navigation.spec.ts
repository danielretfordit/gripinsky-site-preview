import { test, expect } from '@playwright/test';
import { noCookieBanner, collectErrors, expectIslandsHydrated, waitScrollEnd, isMobile } from './helpers';

// Шапка, мобильное меню, подвал и хлебные крошки: переходы между страницами
test.beforeEach(async ({ page }) => { await noCookieBanner(page); });

test.describe('мобильное меню', () => {
  test.beforeEach(async ({ page }) => { test.skip(!isMobile(page), 'меню-гамбургер только до 768'); });

  test('открыть, закрыть кнопкой и Esc, фокус возвращается на кнопку', async ({ page }) => {
    await page.goto('/courses-page/visualization');
    const btn = page.locator('#site-menu summary');
    const menu = page.locator('#site-primary-menu');
    await expect(menu).toBeHidden();
    await btn.click();
    await expect(menu).toBeVisible();
    await expect(page.locator('#site-menu summary')).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('#site-menu summary')).toHaveAccessibleName('Меню сайта');
    await page.locator('#site-menu summary').click();
    await expect(menu).toBeHidden();
    await expect(page.locator('#site-menu summary')).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#site-menu summary').click();
    await expect(menu).toBeVisible();
    await menu.getByRole('link').first().focus();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.locator('#site-menu summary')).toBeFocused();
  });

  test('ссылки меню ведут на свои страницы', async ({ page }) => {
    await page.goto('/');
    const links = await page.locator('#site-primary-menu a').evaluateAll((as) => as.map((a) => [a.textContent!.trim(), a.getAttribute('href')!]));
    expect(links.length).toBeGreaterThanOrEqual(5);
    for (const [label, href] of links) {
      await page.goto('/');
      await page.locator('#site-menu summary').click();
      await page.locator('#site-primary-menu').getByRole('link', { name: label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${href}$`));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // Текущий раздел отмечен в меню (меню открывается скриптом, ждём загрузку страницы)
      await page.waitForLoadState('load');
      await page.locator('#site-menu summary').click();
      await expect(page.locator('#site-primary-menu').getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    }
  });

  test('«Бесплатная консультация» в меню закрывает меню и ведёт к форме', async ({ page }) => {
    await page.goto('/blog');
    await page.locator('#site-menu summary').click();
    await page.getByRole('link', { name: 'Бесплатная консультация', exact: true }).first().click();
    await expect(page.locator('#site-primary-menu')).toBeHidden();
    await waitScrollEnd(page);
    await expect(page.locator('#consult-title')).toBeInViewport();
  });
});

test.describe('шапка, подвал, крошки', () => {
  test('ссылки шапки на ноутбуке и компьютере', async ({ page }) => {
    test.skip(page.viewportSize()!.width <= 1100, 'до 1024 px вместо меню в шапке кнопка «Открыть меню»');
    await page.goto('/');
    const nav = page.locator('.site-header__nav--desktop');
    for (const label of ['3D-визуализация', 'Все курсы', 'Работы учеников', 'Отзывы', 'Блог']) {
      await nav.getByRole('link', { name: label }).click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('.site-header__nav--desktop').getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
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
    await expect(page.locator('#stories-title article.story').first()).toBeVisible();
    await expect(page.locator('#stories-title article.story').first()).toContainText('Было');
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
