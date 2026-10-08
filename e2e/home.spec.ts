import { test, expect, type Page } from '@playwright/test';
import { noCookieBanner, collectErrors, expectIslandsHydrated, waitScrollEnd, headingClearOfSticky } from './helpers';

// Главная: структура, навигация, выбор по программе и тест подбора
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

test('баннер и порядок блоков сохранены, сообщество открывается', async ({ page }) => {
  await expect(page.locator('#home-title')).toHaveText(/Курсы 3D-графики с нуля до заказов/i);
  await expect(page.locator('.hero__img')).toBeVisible();
  await expect(page.locator('.stats-ribbon__item')).toHaveCount(5);
  const ids = await page.locator('main h1[id], main h2[id]').evaluateAll((headings) => headings.map((el) => el.id));
  const ordered = ['home-title', 'dir-title', 'ai-title', 'hw-title', 'why-title', 'club-title', 'hr-title', 'about-title', 'faq-title'];
  const positions = ordered.map((id) => ids.indexOf(id));
  expect(positions.every((position) => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(await page.locator('.stats-ribbon').evaluate((el) => !!(el.compareDocumentPosition(document.querySelector('#directions')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(page.locator('#ai-title')).toHaveText(/ИИ или умри/i);
  await page.getByRole('link', { name: 'Узнать о сообществе' }).click();
  await expect(page).toHaveURL(/\/club$/);
  await expect(page.getByRole('heading', { level: 1, name: /растём в 3D вместе/i })).toBeVisible();
});

test('«По программе»: плитка программы открывает каталог с фильтром', async ({ page }) => {
  await page.getByRole('tab', { name: 'По программе' }).click();
  const tile = page.locator('#pick-soft a').first();
  const href = await tile.getAttribute('href');
  expect(href).toMatch(/^\/courses\?soft=/);
  await tile.click();
  // Каталог переписывает адрес через URLSearchParams (пробел становится «+»): сравниваем значение фильтра
  await expect.poll(() => new URL(page.url()).searchParams.get('soft')).toBe(new URL(href!, 'http://x').searchParams.get('soft'));
  await expect(page).toHaveURL(/\/courses\?/);
});
