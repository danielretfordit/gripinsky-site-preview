import { test, expect, type Page } from '@playwright/test';
import { noCookieBanner, collectErrors, expectIslandsHydrated, waitScrollEnd, headingClearOfSticky } from './helpers';

// Главная: кнопки первого экрана, тест подбора (все ветки), слайдер
let errors: string[];
test.beforeEach(async ({ page }) => {
  await noCookieBanner(page);
  errors = collectErrors(page);
  await page.goto('/');
  await expectIslandsHydrated(page);
});
test.afterEach(async () => { expect(errors, errors.join('\n')).toEqual([]); });

const quiz = (page: Page) => page.locator('#quiz');
const answer = async (page: Page, labels: string[]) => { for (const l of labels) await quiz(page).getByRole('button', { name: l, exact: true }).click(); };

test('при загрузке фокус остаётся в начале страницы, первый Tab на ссылку «К содержанию»', async ({ page }) => {
  expect(await page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'К содержанию' })).toBeFocused();
});

test('кнопки первого экрана ведут к направлениям и тесту', async ({ page }) => {
  await page.getByRole('link', { name: 'Выбрать направление' }).click();
  await waitScrollEnd(page);
  await expect(page.locator('#dir-title')).toBeInViewport();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.locator('main section').first().getByRole('link', { name: 'Подобрать курс за 1 минуту' }).click();
  await waitScrollEnd(page);
  await expect(quiz(page).getByText('Вопрос 1 из 5')).toBeInViewport();
});

test('ветка «3D для игр»: результат и ссылка на курсы для игр, «Назад», «Пройти заново»', async ({ page }) => {
  await answer(page, ['Игровые миры: предметы, локации, персонажей']);
  await expect(quiz(page).getByText('3D для игр', { exact: true })).toBeVisible();
  await expect(quiz(page).getByRole('link', { name: 'Смотреть курсы для игр' })).toHaveAttribute('href', '/courses-page/gamedev');
  await quiz(page).getByRole('button', { name: 'Пройти заново' }).click();
  await expect(quiz(page).getByText('Вопрос 1 из 5')).toBeVisible();
  await answer(page, ['Пока не знаю']);
  await expect(quiz(page).getByText('Вопрос 2 из 5')).toBeVisible();
  await quiz(page).getByRole('button', { name: 'Назад' }).click();
  await expect(quiz(page).getByText('Вопрос 1 из 5')).toBeVisible();
});

test('ветка визуализации: «Показать пакет» открывает направление с собранным пакетом', async ({ page }) => {
  await answer(page, ['Интерьеры, дома и предметы', 'Да, уверенно моделирую', 'Да, делаю фотореалистичные рендеры', 'Визуализатором экстерьеров и ЖК', 'С личным наставником']);
  await expect(quiz(page).getByText('Уверенный уровень')).toBeVisible();
  const price = Number(((await quiz(page).getByText('Пакет целиком').locator('xpath=..').locator('b').textContent()) ?? '').replace(/\D/g, ''));
  await quiz(page).getByRole('button', { name: /Показать пакет и цену/ }).click();
  await expect(page).toHaveURL(/\/courses-page\/visualization\?prof=ext&tariff=mentor&base=0&c=exteriorpro%2Cresidential_complex#package$/);
  await expectIslandsHydrated(page);
  const total = page.locator('#package-summary [aria-live] span.text-\\[30px\\]');
  await expect.poll(async () => Number(((await total.textContent()) ?? '').replace(/\D/g, ''))).toBe(price);
  await waitScrollEnd(page);
  const h = await headingClearOfSticky(page.locator('#package-title'));
  expect(h.top).toBeGreaterThanOrEqual(h.stickyBottom - 1);
  expect(h.bottom).toBeLessThanOrEqual(h.vh);
});

test('ветка «Пока не знаю»: «Подобрать со специалистом» остаётся на главной у формы', async ({ page }) => {
  await answer(page, ['Пока не знаю', 'Никогда', 'Нет', 'Пока не знаю', 'Сам, в своём темпе']);
  await quiz(page).getByRole('link', { name: 'Подобрать со специалистом' }).click();
  await waitScrollEnd(page);
  await expect(page).toHaveURL(/\/#consult$/);
  await expect(page.locator('#consult-title')).toBeInViewport();
  expect(await page.evaluate(() => sessionStorage.getItem('gr-quiz-summary'))).toContain('не уверен');
});

test('слайдер до/после на главной', async ({ page }) => {
  const input = page.locator('[data-ba] input');
  await input.focus();
  await page.keyboard.press('Home');
  await expect(input).toHaveValue('0');
  await page.keyboard.press('ArrowRight');
  await expect(input).toHaveValue('1');
});
