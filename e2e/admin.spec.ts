import { test, expect } from '@playwright/test';
import { collectErrors } from './helpers';

// Админка Keystatic (только в dev): главная, список коллекции, запись, без ошибок консоли
test.describe('админка Keystatic', () => {
  test.setTimeout(60_000);

  test('главная админки, коллекция работ и одна запись', async ({ page }) => {
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
    await page.goto('/keystatic/singleton/settings');
    await expect(page.getByRole('button', { name: /Save|Сохранить/ })).toBeVisible({ timeout: 30_000 });

    expect(errors, errors.join('\n')).toEqual([]);
  });
});
