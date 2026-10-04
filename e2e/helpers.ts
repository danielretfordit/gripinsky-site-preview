import { expect, type Page } from '@playwright/test';

/** Скрыть cookie-баннер, чтобы он не перекрывал кнопки в тестах */
export async function noCookieBanner(page: Page) {
  await page.addInitScript(() => { try { localStorage.setItem('gr-cookie-consent', 'necessary'); } catch {} });
}

/** Ошибки консоли и упавшие запросы за время теста */
export function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 500) errors.push(`HTTP ${r.status()}: ${r.url()}`); });
  return errors;
}

export async function expectNoHorizontalOverflow(page: Page) {
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  expect(r.sw, `ширина документа ${r.sw} > окна ${r.iw}`).toBeLessThanOrEqual(r.iw + 1);
}

/** Все острова Astro на странице загрузились (атрибут ssr снимается после гидратации) */
export async function expectIslandsHydrated(page: Page) {
  await expect.poll(async () => page.locator('astro-island[ssr]').count(), { timeout: 15_000 }).toBe(0);
}
