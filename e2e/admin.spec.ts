import { test, expect } from '@playwright/test';
import { collectErrors } from './helpers';

// Админка Keystatic (только в dev): главная, список коллекции, запись, без ошибок консоли
test.describe('админка Keystatic', () => {
  test.setTimeout(60_000);

  test('главная админки, коллекции и формы записей', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop-1440', 'Админка проверяется один раз: её интерфейс не входит в адаптивные страницы сайта');
    const errors = collectErrors(page);
    const res = await page.goto('/keystatic');
    expect(res?.status()).toBe(200);
    await expect(page.locator('body')).toContainText('Курсы и пакеты', { timeout: 30_000 });

    await page.goto('/keystatic/collection/works');
    // Таблица записей коллекции
    const rows = page.getByRole('row').filter({ hasText: 'akopyan-kreslo' });
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    expect(await page.getByRole('row').count()).toBeGreaterThan(5);
    await rows.first().getByText('akopyan-kreslo').click();
    await expect(page).toHaveURL(/\/keystatic\/collection\/works\/item\/akopyan-kreslo$/);
    // Форма записи: поля и кнопка сохранения
    await expect(page.getByRole('button', { name: /Save|Сохранить/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('input').first()).toBeVisible();

    await page.goto('/keystatic/collection/courses');
    await expect(page.getByRole('row').filter({ hasText: 'interiorpro' }).first()).toBeVisible({ timeout: 30_000 });
    await page.goto('/keystatic/collection/courses/item/ai');
    await expect(page.locator('main')).toContainText('Цена без чата поддержки, ₽');
    await expect(page.getByRole('alert').filter({ hasText: 'Field validation failed' })).toHaveCount(0);
    await page.goto('/keystatic/singleton/settings');
    await expect(page.getByRole('button', { name: /Save|Сохранить/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('main')).toContainText('Ступени скидки');

    await page.goto('/keystatic/collection/pageSeo/item/ai');
    await expect(page.getByRole('button', { name: /Save|Сохранить/ })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Title страницы', { exact: true })).toHaveValue(/Курс «ИИ в 3D»/);
    await expect(page.getByRole('textbox', { name: /^Путь страницы/ })).toHaveValue('/ai');
    await expect(page.getByLabel('Description', { exact: true })).toHaveValue(/ретопология/);
    await expect(page.getByRole('alert').filter({ hasText: 'Field validation failed' })).toHaveCount(0);

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
