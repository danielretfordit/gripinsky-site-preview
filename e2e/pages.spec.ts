import { test, expect } from '@playwright/test';
import {
  noCookieBanner, collectErrors, expectNoHorizontalOverflow, expectIslandsHydrated, scrollThrough,
  expectNoBrokenImages, findOffscreen, findNestedVerticalScrollers, allPages, NOT_FOUND,
} from './helpers';

// Все страницы сайта (список из dist/client после `npm run build`, без сборки: обязательный набор)
// на четырёх ширинах: статус, ошибки, острова, картинки, горизонтальная прокрутка, вылезающие элементы.
const PAGES = allPages();

test.beforeEach(async ({ page }) => { await noCookieBanner(page); });

for (const path of [...PAGES, NOT_FOUND]) {
  test(`страница ${path}`, async ({ page }) => {
    const notFound = path === NOT_FOUND;
    const errors = collectErrors(page);
    const res = await page.goto(path);
    expect(res?.status(), 'статус ответа').toBe(notFound ? 404 : 200);
    if (notFound) await expect(page.getByRole('heading', { level: 1 })).toContainText('Такой страницы');
    await expectIslandsHydrated(page);
    await scrollThrough(page);
    await expectNoBrokenImages(page);
    await expectNoHorizontalOverflow(page);
    const off = await findOffscreen(page);
    expect(off, `вылезают за край окна:\n${off.join('\n')}`).toEqual([]);
    const nested = await findNestedVerticalScrollers(page);
    expect(nested, `вложенная вертикальная прокрутка:\n${nested.join('\n')}`).toEqual([]);
    // У 404 браузер пишет в консоль «Failed to load resource: 404» про сам документ, это ожидаемо
    const real = errors.filter((e) => !(notFound && /status of 404/.test(e)));
    expect(real, real.join('\n')).toEqual([]);
  });
}
