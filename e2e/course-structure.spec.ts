import { test, expect } from '@playwright/test';
import { noCookieBanner, expectNoHorizontalOverflow } from './helpers';

// Проверяем последовательность решения о покупке, доступность программы и корзину.
for (const path of ['/modeling1', '/interiorpro', '/materialspro', '/blender']) {
  test(`структура курса ${path}`, async ({ page }) => {
    await noCookieBanner(page);
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.locator('h1')).toHaveCount(1);
    await expectNoHorizontalOverflow(page);
    // Переключение программы мышью и клавиатурой, включая мобильную сетку.
    const tabs = page.locator('[data-course-program] [role="tab"]');
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await tabs.last().click();
    await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-course-panel]:visible')).toHaveCount(1);
    await tabs.last().press('Home');
    await expect(tabs.first()).toBeFocused();
    await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('[data-course-panel]').first()).toBeVisible();
    const sections = await page.locator('main section[id]').evaluateAll(nodes => nodes.map(n => n.id));
    const price = sections.indexOf('course-price');
    expect(price).toBeGreaterThanOrEqual(0);
    if (sections.includes('course-program')) expect(sections.indexOf('course-program')).toBeLessThan(price);
    if (sections.includes('course-projects')) expect(sections.indexOf('course-projects')).toBeLessThan(price);
    if (sections.includes('course-questions')) expect(sections.indexOf('course-questions')).toBeGreaterThan(price);
    await page.getByRole('link', { name: /^Выбрать курс,/ }).click();
    await expect(page).toHaveURL(/#course-price$/);
    const buy = page.locator(`#course-price [data-cart-add="${path.slice(1)}"]`);
    await expect(buy).toBeEnabled();
    await buy.click();
    await expect(buy).toContainText('В корзине');
  });
}
