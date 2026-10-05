import { test, expect, type Page } from '@playwright/test';
import { noCookieBanner, expectIslandsHydrated, coveredBy, headingClearOfSticky, isMobile, waitScrollEnd } from './helpers';

// Прокрутка: фокус не прячется под фиксированными слоями, лента прокручивается сама, reduced motion

/** Пройти Tab-ом по странице и собрать элементы, которые в момент фокуса закрыты фиксированным слоем или вне окна */
async function tabAndCollect(page: Page, steps: number, from?: string) {
  if (from) await page.locator(from).first().evaluate((el) => (el as HTMLElement).focus({ preventScroll: false }));
  const bad: string[] = [];
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(30);
    await waitScrollEnd(page);
    const focused = page.locator(':focus');
    if (!(await focused.count())) continue;
    const info = await focused.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const fixed = el.closest('#cookie-banner, [aria-hidden="false"].fixed, dialog');
      return { name: `${el.tagName.toLowerCase()} «${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40)}»`, top: r.top, bottom: r.bottom, w: r.width, h: r.height, vh: window.innerHeight, inFixed: Boolean(fixed), sr: el.classList.contains('sr-only') };
    });
    if (info.inFixed || info.w < 2 || info.h < 2) continue;
    const by = await coveredBy(focused);
    if (by) bad.push(`${info.name} закрыт ${by}`);
    else if (info.bottom > info.vh + 1 || info.top < -1) bad.push(`${info.name} вне окна (${Math.round(info.top)}..${Math.round(info.bottom)})`);
  }
  return bad;
}

test.describe('фокус с клавиатуры не уходит под фиксированные слои', () => {
  for (const path of ['/', '/courses-page/visualization', '/interiorpro', '/courses']) {
    test(`${path}: при видимом cookie-баннере`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(path);
      await expectIslandsHydrated(page);
      await expect(page.locator('#cookie-banner')).toBeVisible();
      const bad = await tabAndCollect(page, 45);
      expect(bad, bad.join('\n')).toEqual([]);
    });
  }

  test('направление: при видимой липкой панели пакета', async ({ page }) => {
    test.setTimeout(120_000);
    await noCookieBanner(page);
    await page.goto('/courses-page/visualization');
    await expectIslandsHydrated(page);
    const bad = await tabAndCollect(page, 40, '#profession [role="radio"][tabindex="0"]');
    expect(bad, bad.join('\n')).toEqual([]);
  });

  test('конец страницы доступен при видимом cookie-баннере: последние ссылки подвала не под баннером', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('#cookie-banner')).toBeVisible();
    const last = page.locator('#site-footer a').last();
    await last.focus();
    await waitScrollEnd(page);
    expect(await coveredBy(last)).toBeNull();
  });
});

test.describe('ленты с горизонтальной прокруткой на телефоне', () => {
  test.beforeEach(async ({ page }) => { await noCookieBanner(page); test.skip(!isMobile(page), 'ленты только на телефоне'); });

  for (const [name, sel] of [['карточки базы', '#base .snap-row'], ['подменю разделов', '[data-subnav]'], ['вкладки результатов', '[data-tabs]'], ['фильтры галереи', '[data-gallery-filters]']] as const) {
    test(`${name}: свайп листает ленту, страница вбок не едет`, async ({ page, browserName }) => {
      test.skip(browserName !== 'chromium');
      await page.goto(sel.includes('gallery') ? '/gallery' : '/courses-page/visualization');
      await expectIslandsHydrated(page);
      const row = page.locator(sel).first();
      await row.scrollIntoViewIfNeeded();
      const canScroll = await row.evaluate((el) => el.scrollWidth > el.clientWidth + 1);
      test.skip(!canScroll, 'лента помещается целиком');
      const b = (await row.boundingBox())!;
      const y = b.y + Math.min(b.height / 2, 20);
      const cdp = await page.context().newCDPSession(page);
      const sY = await page.evaluate(() => window.scrollY);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: b.x + b.width * 0.85, y }] });
      for (let k = 1; k <= 8; k++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: b.x + b.width * (0.85 - 0.08 * k), y }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(20);
      expect(await page.evaluate(() => window.scrollX)).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);
      expect(Math.abs((await page.evaluate(() => window.scrollY)) - sY)).toBeLessThanOrEqual(5);
    });
  }

  test('вертикальный свайп по ленте прокручивает страницу', async ({ page, browserName }) => {
    test.skip(browserName !== 'chromium');
    await page.goto('/courses-page/visualization');
    const row = page.locator('#base .snap-row');
    await row.scrollIntoViewIfNeeded();
    const b = (await row.boundingBox())!;
    const sY = await page.evaluate(() => window.scrollY);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + 100), yDistance: -300, xDistance: 0, gestureSourceType: 'touch', speed: 1200 });
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(sY + 100);
    expect(await row.evaluate((el) => el.scrollLeft)).toBe(0);
  });
});

test.describe('prefers-reduced-motion', () => {
  test.use({ reducedMotion: 'reduce' });
  test.beforeEach(async ({ page }) => { await noCookieBanner(page); });

  test('якоря и кнопки прокручивают сразу, без плавной анимации', async ({ page }) => {
    await page.goto('/courses-page/visualization');
    await expectIslandsHydrated(page);
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
    await page.getByRole('navigation', { name: 'Разделы страницы' }).getByRole('link', { name: 'Цены' }).click();
    // Без ожидания: позиция уже конечная
    const h = await headingClearOfSticky(page.locator('#package-title'));
    expect(h.top).toBeGreaterThanOrEqual(h.stickyBottom - 1);
    expect(h.bottom).toBeLessThanOrEqual(h.vh);
    await page.getByRole('button', { name: 'Добавить профессию ↓' }).click();
    const h2 = await headingClearOfSticky(page.locator('#profession-title'));
    expect(h2.top).toBeGreaterThanOrEqual(h2.stickyBottom - 1);
    expect(h2.bottom).toBeLessThanOrEqual(h2.vh);
    await expect(page.locator('#profession-title')).toBeFocused();
  });

  test('лента подменю и вкладок тоже прокручивается сразу', async ({ page }) => {
    test.skip(!isMobile(page), 'ленты прокручиваются только на телефоне');
    await page.goto('/courses-page/visualization');
    await expectIslandsHydrated(page);
    await page.getByRole('tab', { name: 'Отзывы' }).click();
    const left = await page.locator('[data-tabs]').evaluate((el) => el.scrollLeft);
    await page.waitForTimeout(400);
    expect(await page.locator('[data-tabs]').evaluate((el) => el.scrollLeft)).toBe(left);
  });
});

test('появление липкой панели не сдвигает страницу', async ({ page }) => {
  await noCookieBanner(page);
  await page.goto('/courses-page/visualization');
  await expectIslandsHydrated(page);
  const target = await page.evaluate(() => {
    const h = document.getElementById('profession-title')!;
    return Math.round(h.getBoundingClientRect().bottom + window.scrollY + 40);
  });
  await page.evaluate((y) => window.scrollTo({ top: y, behavior: 'instant' }), target);
  await expect(page.locator('astro-island [aria-hidden="false"]').filter({ hasText: 'Ваш пакет' })).toBeVisible();
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => Math.round(window.scrollY))).toBe(target);
});
