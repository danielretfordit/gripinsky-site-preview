import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { noCookieBanner, expectIslandsHydrated, waitScrollEnd, expectNoHorizontalOverflow } from './helpers';

const shots = 'docs/design/shots/restoration';
test.beforeEach(async ({ page }) => { await noCookieBanner(page); });

test('восстановление: метрики, лесенка и переход в тест', async ({ page }) => {
  await page.goto('/courses-page/visualization');
  await expectIslandsHydrated(page);
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.stats-ribbon__item')).toHaveCount(5);
  const width = page.viewportSize()!.width;
  if (width >= 768) {
    const tops = await page.locator('.stats-ribbon__item').evaluateAll((nodes) => nodes.map(n => n.getBoundingClientRect().top));
    expect(Math.max(...tops) - Math.min(...tops)).toBeLessThan(1);
  }
  await expect(page.locator('.learning-ladder__step')).toHaveCount(4);
  if (width >= 1280) {
    const tops = await page.locator('.learning-ladder__step').evaluateAll((nodes) => nodes.map(n => n.getBoundingClientRect().top));
    for (let i = 1; i < tops.length; i++) expect(tops[i - 1] - tops[i]).toBeGreaterThan(40);
  }
  await page.getByRole('navigation', { name: 'Разделы страницы' }).getByRole('link', { name: 'Путь ученика', exact: true }).click();
  await waitScrollEnd(page);
  await expect(page.locator('#path-title')).toBeInViewport();
  await expectNoHorizontalOverflow(page);
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: shots + '/path-' + width + '.png' });
  await page.locator('#path').getByRole('link', { name: /Пройти тест/ }).click();
  await expect(page.locator('#quiz')).toContainText('Вопрос 1 из 4');
  await waitScrollEnd(page);
  await expect(page.locator('#quiz').getByText('Вопрос 1 из 4')).toBeInViewport();
});

test('восстановление: шесть этапов ИИ, результаты и тарифы', async ({ page }) => {
  await page.goto('/ai');
  await expectIslandsHydrated(page);
  await expect(page).toHaveTitle(/Курс «ИИ в 3D»/);
  await expect(page.locator('.ai-roadmap__step')).toHaveCount(6);
  await expect(page.locator('.ai-outcomes__list > li')).toHaveCount(3);
  await expect(page.getByRole('progressbar').last()).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('link', { name: 'Программа', exact: true }).click();
  await waitScrollEnd(page);
  await expectNoHorizontalOverflow(page);
  mkdirSync(shots, { recursive: true });
  await page.screenshot({ path: shots + '/ai-' + page.viewportSize()!.width + '.png' });
  await page.getByRole('button', { name: 'Купить', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Самостоятельно');
  await expect(page.getByRole('dialog')).toContainText(/4\s*900/);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Выбрать «Лабораторию»', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Лаборатория');
  await expect(page.getByRole('dialog')).toContainText(/9\s*900/);
  await page.keyboard.press('Escape');
});
