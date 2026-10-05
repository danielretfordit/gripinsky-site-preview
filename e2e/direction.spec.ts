import { test, expect, type Page } from '@playwright/test';
import { noCookieBanner, collectErrors, expectIslandsHydrated, waitScrollEnd, headingClearOfSticky, expectNoBrokenImages, isMobile } from './helpers';

// Страница направления /courses-page/visualization: все интерактивные элементы по очереди
const URL = '/courses-page/visualization';
const num = (s: string | null) => Number((s ?? '').replace(/[^\d]/g, ''));
const total = (page: Page) => page.locator('#package-summary [aria-live]').first().locator('span.text-\\[30px\\]');
const totalNum = async (page: Page) => num(await total(page).textContent());

let errors: string[];
test.beforeEach(async ({ page }) => {
  await noCookieBanner(page);
  errors = collectErrors(page);
  await page.goto(URL);
  await expectIslandsHydrated(page);
});
test.afterEach(async () => { expect(errors, errors.join('\n')).toEqual([]); });

/** Ответы на тест по подписям кнопок */
async function answerQuiz(page: Page, labels: string[]) {
  const quiz = page.locator('#quiz');
  for (const l of labels) await quiz.getByRole('button', { name: l, exact: true }).click();
}

test.describe('подменю разделов', () => {
  const targets: [string, string][] = [
    ['Результаты', '#works-title'], ['Как учимся', '#path-title'], ['База', '#base-title'],
    ['Профессии', '#profession-title'], ['Цены', '#package-title'], ['Вопросы', '#faq-title'],
  ];
  for (const [label, heading] of targets) {
    test(`«${label}» прокручивает к своему разделу, заголовок не под подменю`, async ({ page }) => {
      const nav = page.getByRole('navigation', { name: 'Разделы страницы' });
      await nav.getByRole('link', { name: label, exact: true }).click();
      await waitScrollEnd(page);
      const h = await headingClearOfSticky(page.locator(heading));
      expect(h.top, `заголовок ${heading} спрятан под подменю`).toBeGreaterThanOrEqual(h.stickyBottom - 1);
      expect(h.bottom, `заголовок ${heading} ниже окна`).toBeLessThanOrEqual(h.vh);
      await expect(page).toHaveURL(new RegExp(`${heading.replace('-title', '')}$`));
      // Активный пункт подсвечен и виден в ленте подменю
      const link = nav.getByRole('link', { name: label, exact: true });
      await expect(link).toHaveAttribute('aria-current', 'true');
      await expect(link).toBeInViewport({ ratio: 0.9 });
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
    });
  }
});

test.describe('вкладки результатов', () => {
  test('клик по вкладкам: панели переключаются, страница не прыгает, картинки грузятся', async ({ page }) => {
    const list = page.getByRole('tablist', { name: 'Результаты выпускников' });
    await list.scrollIntoViewIfNeeded();
    for (const name of ['Истории', 'Награды', 'Отзывы', 'Работы']) {
      const before = await list.evaluate((el) => el.getBoundingClientRect().top);
      const tab = list.getByRole('tab', { name });
      await tab.click();
      await expect(tab).toHaveAttribute('aria-selected', 'true');
      const panel = page.locator(`#${await tab.getAttribute('aria-controls')}`);
      await expect(panel).toBeVisible();
      await expect(page.locator('[role="tabpanel"]:visible')).toHaveCount(1);
      const after = await list.evaluate((el) => el.getBoundingClientRect().top);
      expect(Math.abs(after - before), `страница сдвинулась на ${after - before}px при переключении на «${name}»`).toBeLessThanOrEqual(1);
      await expect(tab).toBeInViewport();
      await expectNoBrokenImages(page, panel);
      await list.scrollIntoViewIfNeeded();
    }
  });

  test('стрелки, Home и End переключают вкладки и переносят фокус', async ({ page }) => {
    const list = page.getByRole('tablist', { name: 'Результаты выпускников' });
    const tabs = list.getByRole('tab');
    await tabs.first().focus();
    await waitScrollEnd(page);
    const y0 = await page.evaluate(() => window.scrollY);
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('End');
    await expect(tabs.nth(3)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(tabs.nth(3)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Home');
    await expect(tabs.nth(0)).toBeFocused();
    await expect(page.locator('#panel-works')).toBeVisible();
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - y0)).toBeLessThanOrEqual(1);
  });

  test('история целиком раскрывается во вкладке «Истории»', async ({ page }) => {
    await page.getByRole('tab', { name: 'Истории' }).click();
    const summary = page.locator('#panel-stories summary', { hasText: 'Читать историю целиком' });
    await summary.click();
    await expect(page.locator('#panel-stories details').first()).toHaveAttribute('open', '');
    await summary.click();
    await expect(page.locator('#panel-stories details').first()).not.toHaveAttribute('open', '');
  });
});

test.describe('слайдер до/после', () => {
  const slider = (page: Page) => page.locator('#panel-works [data-ba]');
  const value = (page: Page) => slider(page).locator('input').inputValue().then(Number);

  test('перетаскивание мышью', async ({ page }) => {
    const box = (await slider(page).boundingBox())!;
    const y = box.y + box.height / 2;
    await slider(page).scrollIntoViewIfNeeded();
    const b = (await slider(page).boundingBox())!;
    await page.mouse.move(b.x + b.width * 0.5, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.35, b.y + b.height / 2, { steps: 5 });
    await page.mouse.move(b.x + b.width * 0.2, b.y + b.height / 2, { steps: 5 });
    await page.mouse.up();
    expect(await value(page)).toBeLessThan(28);
    // Клик в любой точке переносит ползунок туда же
    await page.mouse.click(b.x + b.width * 0.8, b.y + b.height * 0.3);
    expect(await value(page)).toBeGreaterThan(72);
    const pos = await slider(page).evaluate((el) => parseFloat(el.style.getPropertyValue('--pos')));
    expect(pos).toBe(await value(page));
    expect(y).toBeGreaterThan(0);
  });

  test('перетаскивание пальцем (тач)', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium', 'тач через CDP только в Chromium');
    await slider(page).scrollIntoViewIfNeeded();
    const b = (await slider(page).boundingBox())!;
    const cdp = await page.context().newCDPSession(page);
    const y = b.y + b.height * 0.4;
    // Палец ставим не на ручку, а сбоку: так делают на телефоне
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
    await touch('touchStart', b.x + b.width * 0.7);
    for (const f of [0.65, 0.55, 0.45, 0.35, 0.25]) await touch('touchMove', b.x + b.width * f);
    await touch('touchEnd', 0);
    await expect.poll(() => value(page)).toBeLessThan(35);
  });

  test('клавиатура: стрелки, Home, End и подпись для экранного диктора', async ({ page }) => {
    const input = slider(page).locator('input');
    await input.focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await value(page)).toBe(52);
    await page.keyboard.press('Home');
    expect(await value(page)).toBe(0);
    await expect(input).toHaveAttribute('aria-valuetext', 'Больше рендера');
    await page.keyboard.press('End');
    expect(await value(page)).toBe(100);
    await expect(input).toHaveAttribute('aria-valuetext', 'Больше модели');
    expect(await slider(page).evaluate((el) => el.style.getPropertyValue('--pos'))).toBe('100%');
  });
});

test.describe('тест «С чего начать»', () => {
  test('ссылка «Тест за 1 минуту» в первом экране открывает тест', async ({ page }) => {
    await page.getByRole('link', { name: 'Тест за 1 минуту' }).click();
    await expect(page.locator('#quiz').getByText('Вопрос 1 из 4')).toBeVisible();
    await waitScrollEnd(page);
    await expect(page.locator('#quiz').getByText('Вопрос 1 из 4')).toBeInViewport();
  });

  test('«Выбрать профессию ↓» на развилке: база снята, профессии на экране', async ({ page }) => {
    const before = await totalNum(page);
    await page.locator('#quiz').getByRole('button', { name: 'Выбрать профессию ↓' }).click();
    await waitScrollEnd(page);
    const h = await headingClearOfSticky(page.locator('#profession-title'));
    expect(h.top).toBeGreaterThanOrEqual(h.stickyBottom - 1);
    expect(h.bottom).toBeLessThanOrEqual(h.vh);
    await expect(page.getByRole('checkbox', { name: /Уже знаю 3ds Max/ })).toBeChecked();
    expect(await totalNum(page)).toBeLessThan(before);
  });

  test('«Назад» и «Пройти заново»', async ({ page }) => {
    await page.locator('#quiz').getByRole('button', { name: 'Пройти тест' }).click();
    const quiz = page.locator('#quiz');
    await expect(quiz.getByRole('button', { name: 'Назад' })).toHaveCount(0);
    await answerQuiz(page, ['Никогда']);
    await expect(quiz.getByText('Вопрос 2 из 4')).toBeVisible();
    await quiz.getByRole('button', { name: 'Назад' }).click();
    await expect(quiz.getByText('Вопрос 1 из 4')).toBeVisible();
    await expect(quiz.getByRole('heading', { level: 3 })).toBeFocused();
    await answerQuiz(page, ['Немного, по урокам или на других курсах', 'Нет', 'Визуализатором интерьеров']);
    await expect(quiz.getByText('Вопрос 4 из 4')).toBeVisible();
    await answerQuiz(page, ['Сам, в своём темпе']);
    await expect(quiz.getByText('Ваш уровень', { exact: true })).toBeVisible();
    await expect(quiz.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '4');
    await quiz.getByRole('button', { name: 'Пройти заново' }).click();
    await expect(quiz.getByText('Вопрос 1 из 4')).toBeVisible();
    await expect(quiz.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  // Все ветки: уровень (новичок, пробелы, уверенный) × профессия × формат
  const branches: { a: string[]; level: string; base: boolean }[] = [
    { a: ['Никогда', 'Нет', 'Визуализатором интерьеров', 'Сам, в своём темпе'], level: 'Новичок', base: true },
    { a: ['Немного, по урокам или на других курсах', 'Простые сцены, но не фотореализм', 'Визуализатором экстерьеров и ЖК', 'С проверкой работ и поддержкой кураторов'], level: 'Есть пробелы', base: true },
    { a: ['Да, уверенно моделирую', 'Простые сцены, но не фотореализм', '3D-моделлером для стоков', 'С личным наставником'], level: 'Есть пробелы', base: true },
    { a: ['Да, уверенно моделирую', 'Да, делаю фотореалистичные рендеры', 'Визуализатором экстерьеров и ЖК', 'Сам, в своём темпе'], level: 'Уверенный уровень', base: false },
  ];
  for (const br of branches) {
    test(`ветка: ${br.a.join(' / ')}`, async ({ page }) => {
      await page.locator('#quiz').getByRole('button', { name: 'Пройти тест' }).click();
      await answerQuiz(page, br.a);
      const quiz = page.locator('#quiz');
      await expect(quiz.getByText(br.level, { exact: true })).toBeVisible();
      const price = num(await quiz.getByText('Пакет целиком').locator('xpath=..').locator('b').textContent());
      await quiz.getByRole('button', { name: /Показать пакет и цену/ }).click();
      await waitScrollEnd(page);
      await expect.poll(() => totalNum(page)).toBe(price);
      await expect(page.getByRole('checkbox', { name: /Уже знаю 3ds Max/ })).toBeChecked({ checked: !br.base });
      const h = await headingClearOfSticky(page.locator('#package-title'));
      expect(h.top).toBeGreaterThanOrEqual(h.stickyBottom - 1);
      expect(h.bottom).toBeLessThanOrEqual(h.vh);
    });
  }

  test('ветка «Пока не знаю»: «Показать пакет ↓» и «Подобрать со специалистом»', async ({ page }) => {
    await page.locator('#quiz').getByRole('button', { name: 'Пройти тест' }).click();
    await answerQuiz(page, ['Никогда', 'Нет', 'Пока не знаю', 'С проверкой работ и поддержкой кураторов']);
    const quiz = page.locator('#quiz');
    await expect(quiz.getByText('самая популярная профессия, уточним на консультации')).toBeVisible();
    const price = num(await quiz.getByText('Пакет целиком').locator('xpath=..').locator('b').textContent());
    await quiz.getByRole('button', { name: 'Показать пакет ↓' }).click();
    await waitScrollEnd(page);
    await expect(page.locator('#package-title')).toBeInViewport();
    expect(await totalNum(page)).toBe(price);

    await quiz.getByRole('link', { name: 'Подобрать со специалистом' }).click();
    await waitScrollEnd(page);
    await expect(page.locator('#consult-title')).toBeInViewport();
    expect(await page.evaluate(() => sessionStorage.getItem('gr-quiz-summary'))).toContain('не уверен');
  });
});

test.describe('формат обучения', () => {
  test('клик и стрелки в radiogroup, цена базы меняется', async ({ page }) => {
    const group = page.getByRole('radiogroup', { name: /Формат/ });
    const radios = group.getByRole('radio');
    await expect(radios).toHaveCount(3);
    const aside = page.getByRole('complementary', { name: 'База 3D-визуализатора' });
    const price = () => aside.locator('[aria-live] span').first().textContent().then(num);
    await radios.nth(0).click();
    await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true');
    const p0 = await price();
    await expect(radios.nth(0)).toBeFocused();
    await page.keyboard.press('ArrowDown');
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect(radios.nth(1)).toBeFocused();
    expect(await price()).toBeGreaterThan(p0);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowUp');
    await expect(radios.nth(2)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('Home');
    await expect(radios.nth(0)).toBeFocused();
    await page.keyboard.press('End');
    await expect(radios.nth(2)).toBeFocused();
    // Только у выбранного tabindex=0
    await expect(group.locator('[tabindex="0"]')).toHaveCount(1);
  });

  test('«Добавить профессию ↓» прокручивает к профессиям', async ({ page }) => {
    await page.getByRole('button', { name: 'Добавить профессию ↓' }).click();
    await waitScrollEnd(page);
    const h = await headingClearOfSticky(page.locator('#profession-title'));
    expect(h.top).toBeGreaterThanOrEqual(h.stickyBottom - 1);
    expect(h.bottom).toBeLessThanOrEqual(h.vh);
  });

  test('«Купить только базу» открывает оформление базы', async ({ page }) => {
    await page.getByRole('radio', { name: /Наставничество/ }).click();
    const aside = page.getByRole('complementary', { name: 'База 3D-визуализатора' });
    const price = num(await aside.locator('[aria-live] span').first().textContent());
    await aside.getByRole('button', { name: 'Купить только базу' }).click();
    const dlg = page.getByRole('dialog');
    await expect(dlg).toBeVisible();
    await expect(dlg).toContainText('Наставничество');
    expect(num(await dlg.locator('b.text-\\[22px\\]').textContent())).toBe(price);
  });
});

test.describe('профессии и пакет', () => {
  test('профессии: клик и стрелки, курсы профессии меняются', async ({ page }) => {
    const group = page.getByRole('radiogroup', { name: 'Профессия' });
    const radios = group.getByRole('radio');
    await radios.nth(1).click();
    await expect(radios.nth(1)).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#profession')).toContainText('Масштабные');
    await page.keyboard.press('ArrowRight');
    await expect(radios.nth(2)).toHaveAttribute('aria-checked', 'true');
    await expect(radios.nth(2)).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(radios.nth(0)).toHaveAttribute('aria-checked', 'true');
    await page.keyboard.press('ArrowLeft');
    await expect(radios.nth(2)).toHaveAttribute('aria-checked', 'true');
  });

  test('переключатель «база не нужна»', async ({ page }) => {
    const box = page.getByRole('checkbox', { name: /Уже знаю 3ds Max/ });
    const t0 = await totalNum(page);
    await page.locator('#profession label', { hasText: 'Уже знаю 3ds Max' }).click();
    await expect(box).toBeChecked();
    await expect(page.getByText('Без базы курсы PRO будут сложными')).toBeVisible();
    expect(await totalNum(page)).toBeLessThan(t0);
    await expect(page.locator('#package-summary')).toContainText('Формат обучения выбирается вместе с базой');
    // Клавиатура: Tab до чекбокса, фокус виден на нарисованном квадрате, пробел переключает
    await page.locator('#profession-title').focus();
    await page.keyboard.press('Tab');
    await expect(box).toBeFocused();
    expect(await page.locator('#profession label .check-box').first().evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('solid');
    await page.keyboard.press('Space');
    await expect(box).not.toBeChecked();
    expect(await totalNum(page)).toBe(t0);
  });

  test('курсы ЖК у экстерьерного визуализатора: добавить, убрать, последний курс не снимается', async ({ page }) => {
    await page.getByRole('radio', { name: /Экстерьерный визуализатор/ }).click();
    const prof = page.locator('#profession');
    const labels = prof.locator('label').filter({ hasText: /В пакете|Добавить в пакет/ });
    await expect(labels).toHaveCount(2);
    const [ext, zk] = [labels.nth(0), labels.nth(1)];
    await expect(prof).toContainText('Масштабные ЖК');
    // По умолчанию в пакете только «Экстерьерная визуализация PRO», снять её нельзя
    await expect(ext).toContainText('В пакете');
    await expect(ext.getByRole('checkbox')).toBeDisabled();
    await expect(prof.getByText('Хотя бы один курс профессии остаётся в пакете')).toBeVisible();
    const t0 = await totalNum(page);
    await zk.click();
    await expect(zk).toContainText('В пакете');
    expect(await totalNum(page)).toBe(t0 + 43900);
    // Теперь можно убрать экстерьеры, ЖК остаётся
    await ext.click();
    await expect(ext).toContainText('Добавить в пакет');
    await expect(zk.getByRole('checkbox')).toBeDisabled();
    expect(await totalNum(page)).toBeLessThan(t0 + 43900);
    // Клавиатура: пробел на чекбоксе
    await ext.getByRole('checkbox').focus();
    await page.keyboard.press('Space');
    await expect(ext).toContainText('В пакете');
    expect(await totalNum(page)).toBe(t0 + 43900);
  });

  test('допы: каждый включается и выключается, итог меняется на цену допа', async ({ page }) => {
    const addons = page.locator('#package fieldset label');
    const n = await addons.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const label = addons.nth(i);
      const t0 = await totalNum(page);
      const price = num((await label.locator('span.text-muted').first().textContent()) ?? '');
      await label.click();
      await expect(label.getByRole('checkbox')).toBeChecked();
      expect(await totalNum(page)).toBe(t0 + price);
      await label.click();
      await expect(label.getByRole('checkbox')).not.toBeChecked();
      expect(await totalNum(page)).toBe(t0);
    }
  });

  test('«Скопировать ссылку на пакет»: ссылка восстанавливает пакет', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium');
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new globalThis.URL(page.url()).origin });
    await page.getByRole('radio', { name: /Экстерьерный визуализатор/ }).click();
    await page.getByRole('radio', { name: /Самостоятельный/ }).click();
    await page.locator('#package fieldset label').first().click();
    const t = await totalNum(page);
    const btn = page.getByRole('button', { name: 'Скопировать ссылку на пакет' });
    await btn.click();
    await expect(page.getByRole('button', { name: 'Ссылка скопирована' })).toBeVisible();
    const link = await page.evaluate(() => navigator.clipboard.readText());
    expect(link).toMatch(/\/courses-page\/visualization\?prof=ext&tariff=lite.*#package$/);
    const p2 = await context.newPage();
    await p2.goto(link);
    await expectIslandsHydrated(p2);
    await expect.poll(() => totalNum(p2)).toBe(t);
    await expect(p2.getByRole('radio', { name: /Экстерьерный визуализатор/ })).toHaveAttribute('aria-checked', 'true');
    await expect(p2.locator('#package-title')).toBeInViewport();
  });

  test('«Скопировать ссылку на пакет» без Clipboard API (открыто по http в локальной сети)', async ({ page }) => {
    await page.addInitScript(() => { Object.defineProperty(Navigator.prototype, 'clipboard', { get: () => undefined }); });
    await page.reload();
    await expectIslandsHydrated(page);
    await page.getByRole('button', { name: 'Скопировать ссылку на пакет' }).click();
    await expect(page.getByRole('button', { name: 'Ссылка скопирована' })).toBeVisible();
  });

  test('пакет из адреса: профессия, формат, без базы, курсы и допы', async ({ page }) => {
    await page.goto(`${URL}?prof=ext&base=0&tariff=lite&c=exteriorpro&a=materialspro#package`);
    await expectIslandsHydrated(page);
    await expect(page.getByRole('radio', { name: /Экстерьерный визуализатор/ })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('checkbox', { name: /Уже знаю 3ds Max/ })).toBeChecked();
    await expect(page.locator('#package fieldset').getByRole('checkbox', { name: /Материалы Corona PRO/ })).toBeChecked();
    await waitScrollEnd(page);
    const h = await headingClearOfSticky(page.locator('#package-title'));
    expect(h.top).toBeGreaterThanOrEqual(h.stickyBottom - 1);
    expect(h.bottom).toBeLessThanOrEqual(h.vh);
  });
});

test.describe('оформление пакета', () => {
  test('диалог: валидация, фокус на первой ошибке, отправка в демо-режиме', async ({ page }) => {
    const opener = page.locator('#package-summary').getByRole('button', { name: 'Оформить пакет' });
    await opener.click();
    const dlg = page.getByRole('dialog', { name: 'Оформление пакета' });
    await expect(dlg).toBeVisible();
    expect(num(await dlg.locator('b.text-\\[22px\\]').textContent())).toBe(await totalNum(page));
    await dlg.getByRole('button', { name: 'Перейти к оплате' }).click();
    await expect(dlg.getByText('Напишите имя')).toBeVisible();
    await expect(dlg.getByText('Проверьте почту')).toBeVisible();
    await expect(dlg.getByText('Проверьте телефон')).toBeVisible();
    await expect(dlg.getByText('Без согласия мы не сможем оформить заказ')).toBeVisible();
    await expect(dlg.getByLabel('Имя и фамилия')).toBeFocused();
    await dlg.getByLabel('Имя и фамилия').fill('Автотест Playwright');
    await dlg.getByLabel('Почта (для доступа к курсам)').fill('не-почта');
    await dlg.getByLabel('Телефон').fill('+7 900 000-00-00');
    await dlg.getByRole('button', { name: 'Перейти к оплате' }).click();
    await expect(dlg.getByText('Напишите имя')).toHaveCount(0);
    await expect(dlg.getByLabel('Почта (для доступа к курсам)')).toBeFocused();
    await dlg.getByLabel('Почта (для доступа к курсам)').fill('autotest@example.com');
    await dlg.getByRole('button', { name: 'Перейти к оплате' }).click();
    await expect(dlg.getByRole('checkbox')).toBeFocused();
    await dlg.locator('label', { hasText: 'Даю согласие' }).locator('.check-box').click();
    await expect(dlg.getByRole('checkbox')).toBeChecked();
    const [req] = await Promise.all([
      page.waitForRequest('**/api/checkout'),
      dlg.getByRole('button', { name: 'Перейти к оплате' }).click(),
    ]);
    const body = req.postDataJSON();
    expect(body.kind).toBe('package');
    expect(body.consent).toBe(true);
    expect(body).not.toHaveProperty('total');
    await expect(page.getByRole('dialog', { name: 'Заявка принята' })).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Понятно' }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test('диалог закрывается крестиком, Esc и кликом по фону', async ({ page }) => {
    const opener = page.locator('#package-summary').getByRole('button', { name: 'Оформить пакет' });
    const dlg = page.getByRole('dialog');
    await opener.click();
    await dlg.getByRole('button', { name: 'Закрыть' }).click();
    await expect(dlg).toBeHidden();
    await expect(opener).toBeFocused();

    await opener.click();
    await expect(dlg).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(dlg).toBeHidden();

    await opener.click();
    await expect(dlg).toBeVisible();
    await page.mouse.click(3, 3);
    await expect(dlg).toBeHidden();
    // Клик внутри диалога его не закрывает
    await opener.click();
    await dlg.getByText('Итого').click();
    await expect(dlg).toBeVisible();
  });
});

test.describe('липкая панель «Ваш пакет»', () => {
  const bar = (page: Page) => page.locator('astro-island [aria-hidden]').filter({ hasText: 'Ваш пакет' }).first();

  test('появляется после профессий, «Оформить» и состав работают, прячется у пакета и у формы', async ({ page }) => {
    await expect(bar(page)).toHaveAttribute('aria-hidden', 'true');
    // Сразу под заголовком профессий: заголовок ушёл вверх, до пакета далеко
    await page.evaluate(() => {
      const h = document.getElementById('profession-title')!;
      window.scrollTo({ top: h.getBoundingClientRect().bottom + window.scrollY + 40, behavior: 'instant' });
    });
    await expect(bar(page)).toHaveAttribute('aria-hidden', 'false');
    await expect(bar(page)).toBeInViewport();
    const y0 = await page.evaluate(() => window.scrollY);
    await bar(page).getByRole('button', { name: /Ваш пакет/ }).click();
    await expect(page.locator('#sticky-sheet')).toBeVisible();
    await expect(page.locator('#sticky-sheet')).toContainText('База 3D-визуализатора');
    await bar(page).getByRole('button', { name: /Ваш пакет/ }).click();
    await expect(page.locator('#sticky-sheet')).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY), 'страница не прыгает при открытии состава').toBe(y0);
    await bar(page).getByRole('button', { name: 'Оформить' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.locator('#package-summary').scrollIntoViewIfNeeded();
    await expect(bar(page)).toHaveAttribute('aria-hidden', 'true');
    await page.locator('#consult').scrollIntoViewIfNeeded();
    await expect(bar(page)).toHaveAttribute('aria-hidden', 'true');
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
    await expect(bar(page)).toHaveAttribute('aria-hidden', 'true');
  });

  test('«Изменить» на планшете и компьютере ведёт к профессиям', async ({ page }) => {
    test.skip(isMobile(page), 'кнопка только с 1024');
    await page.evaluate(() => {
      const h = document.getElementById('profession-title')!;
      window.scrollTo({ top: h.getBoundingClientRect().bottom + window.scrollY + 40, behavior: 'instant' });
    });
    const change = bar(page).getByRole('link', { name: 'Изменить' });
    if (!(await change.isVisible())) test.skip(true, 'кнопка скрыта на этой ширине');
    await change.click();
    await waitScrollEnd(page);
    const h = await headingClearOfSticky(page.locator('#profession-title'));
    expect(h.top).toBeGreaterThanOrEqual(h.stickyBottom - 1);
  });
});
