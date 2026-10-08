import { test, expect, type Page } from '@playwright/test';
import { noCookieBanner, collectErrors } from './helpers';

// Каталог /courses: фильтры по типу, направлению и программе, сортировка, состояние в адресе
const visibleCards = (page: Page) => page.locator('[data-grid] [data-course]:visible');
const shown = async (page: Page) => Number(((await page.locator('[data-count]').textContent()) ?? '').replace(/\D/g, ''));

let errors: string[];
test.beforeEach(async ({ page }) => { await noCookieBanner(page); errors = collectErrors(page); });
test.afterEach(async () => { expect(errors, errors.join('\n')).toEqual([]); });

test('кнопки типа: счётчики совпадают с карточками, aria-pressed, адрес обновляется', async ({ page }) => {
  await page.goto('/courses');
  const group = page.getByRole('group', { name: 'Тип' });
  const buttons = group.getByRole('button');
  const n = await buttons.count();
  for (let i = 0; i < n; i++) {
    const b = buttons.nth(i);
    const expected = Number(((await b.locator('span').textContent()) ?? '').replace(/\D/g, ''));
    await b.click();
    await expect(b).toHaveAttribute('aria-pressed', 'true');
    await expect(group.locator('[aria-pressed="true"]')).toHaveCount(1);
    await expect(visibleCards(page)).toHaveCount(expected);
    expect(await shown(page)).toBe(expected);
    const type = await b.getAttribute('data-filter-type');
    await expect(page).toHaveURL(type === 'all' ? /\/courses$/ : new RegExp(`\\?type=${type}$`));
  }
});

test('у каждого направления и программы есть курсы', async ({ page }) => {
  await page.goto('/courses');
  for (const sel of ['[data-filter-tag="dir"]', '[data-filter-tag="soft"]']) {
    const select = page.locator(sel);
    const values = await select.locator('option').evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
    const empty: string[] = [];
    for (const v of values) {
      await select.selectOption(v);
      if ((await visibleCards(page).count()) === 0) empty.push(v);
      expect(await shown(page)).toBe(await visibleCards(page).count());
    }
    await select.selectOption('');
    expect(empty, `пустой результат для: ${empty.join(', ')}`).toEqual([]);
  }
});

test('сочетание фильтров и пустой результат с подсказкой', async ({ page }) => {
  await page.goto('/courses');
  await page.getByRole('group', { name: 'Тип' }).getByRole('button', { name: /Бесплатные/ }).click();
  await page.locator('[data-filter-tag="soft"]').selectOption('zbrush');
  const count = await visibleCards(page).count();
  if (count === 0) await expect(page.locator('[data-empty]')).toBeVisible();
  else await expect(page.locator('[data-empty]')).toBeHidden();
  await expect(page).toHaveURL(/type=free/);
  await expect(page).toHaveURL(/soft=zbrush/);
});

test('сортировка по цене в обе стороны и обратно к исходному порядку', async ({ page }) => {
  await page.goto('/courses');
  const prices = () => visibleCards(page).evaluateAll((cs) => cs.map((c) => Number((c as HTMLElement).dataset.price)));
  const initial = await page.locator('[data-grid] [data-course] h2').allTextContents();
  await page.locator('[data-sort]').selectOption('asc');
  const asc = await prices();
  expect(asc).toEqual([...asc].sort((a, b) => a - b));
  await page.locator('[data-sort]').selectOption('desc');
  const desc = await prices();
  expect(desc).toEqual([...desc].sort((a, b) => b - a));
  await page.locator('[data-sort]').selectOption('default');
  expect(await page.locator('[data-grid] [data-course] h2').allTextContents()).toEqual(initial);
});

for (const [query, type] of [['?type=free', 'free'], ['?type=service', 'service'], ['?type=course&dir=интерьер', 'course']] as const) {
  test(`фильтр из адреса ${query}`, async ({ page }) => {
    await page.goto(`/courses${query}`);
    const group = page.getByRole('group', { name: 'Тип' });
    await expect(group.locator(`[data-filter-type="${type}"]`)).toHaveAttribute('aria-pressed', 'true');
    const cards = visibleCards(page);
    expect(await cards.count()).toBeGreaterThan(0);
    const types = await cards.evaluateAll((cs) => cs.map((c) => (c as HTMLElement).dataset.type));
    for (const t of types) expect(type === 'service' ? ['service', 'plugin'] : [type]).toContain(t);
    if (query.includes('dir=')) {
      await expect(page.locator('[data-filter-tag="dir"]')).toHaveValue('интерьер');
      const tags = await cards.evaluateAll((cs) => cs.map((c) => (c as HTMLElement).dataset.tags));
      for (const t of tags) expect(t).toContain('интерьер');
    }
    expect(await shown(page)).toBe(await cards.count());
  });
}

test('фильтр только по направлению из адреса (без типа)', async ({ page }) => {
  await page.goto('/courses?soft=blender');
  await expect(page.locator('[data-filter-tag="soft"]')).toHaveValue('blender');
  const tags = await visibleCards(page).evaluateAll((cs) => cs.map((c) => (c as HTMLElement).dataset.tags));
  expect(tags.length).toBeGreaterThan(0);
  for (const t of tags) expect(t).toContain('blender');
});

test('карточка курса целиком кликабельна', async ({ page }) => {
  await page.goto('/courses');
  const card = page.locator('[data-grid] [data-course]').nth(1);
  const href = await card.locator('a').getAttribute('href');
  // Клик по картинке карточки (над ней растянута ссылка)
  await card.click({ position: { x: 30, y: 30 } });
  await expect(page).toHaveURL(new RegExp(`${href}$`));
});

test('сортировки сохраняются в адресе, новинка первая, популярность по рангу', async ({ page }) => {
  await page.goto('/courses?sort=newest');
  await expect(page.locator('[data-sort]')).toHaveValue('newest');
  await expect(visibleCards(page).first()).toHaveAttribute('data-new', '1');
  await expect(visibleCards(page).first().locator('.art-new')).toHaveText('Новый курс');
  await page.locator('[data-sort]').selectOption('popular');
  await expect(page).toHaveURL(/sort=popular/);
  const ranks = await visibleCards(page).evaluateAll((cs) => cs.map((c) => Number((c as HTMLElement).dataset.popularity || Infinity)));
  expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  await expect(visibleCards(page).first().locator('a')).toHaveAttribute('href', '/3dstock');
  await page.getByRole('group', { name: 'Тип' }).getByRole('button', { name: /^Курсы/ }).click();
  await expect(visibleCards(page).first().locator('a')).toHaveAttribute('href', '/3dstock');
  await expect(page.locator('[data-sort-note]')).toContainText('август 2025');
  await page.reload();
  await expect(page.locator('[data-sort]')).toHaveValue('popular');
  await expect(visibleCards(page).first().locator('a')).toHaveAttribute('href', '/3dstock');
  await page.locator('[data-reset]').click();
  await expect(page).toHaveURL(/\/courses$/);
  await expect(page.locator('[data-reset]')).toBeHidden();
});

test('пакеты индивидуальных занятий находятся только в услугах', async ({ page }) => {
  await page.goto('/courses?type=course');
  await expect(visibleCards(page).filter({ hasText: '5 индивидуальных занятий' })).toHaveCount(0);
  await expect(visibleCards(page).filter({ hasText: '10 индивидуальных занятий' })).toHaveCount(0);
  await page.getByRole('button', { name: /^Услуги/ }).click();
  await expect(visibleCards(page).filter({ hasText: '5 индивидуальных занятий' })).toHaveCount(1);
  await expect(visibleCards(page).filter({ hasText: '10 индивидуальных занятий' })).toHaveCount(1);
});

test('метки находятся на обложках, адаптив не переполняется', async ({ page }) => {
  await page.goto('/courses?type=course&soft=3ds+max');
  const card = visibleCards(page).filter({ has: page.locator('a[href="/modeling1"]') });
  await expect(card.locator('.course-art-top')).toContainText('Новичок');
  await expect(card.locator('.course-art-bottom')).toContainText('3ds Max');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.locator('[data-filters]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: `docs/design/shots/catalog-${page.viewportSize()!.width}.png` });
});
