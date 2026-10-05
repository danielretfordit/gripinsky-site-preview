import { expect, type Page, type Locator, type TestInfo } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

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

/**
 * Нет горизонтальной прокрутки. Сравниваем с шириной окна из настроек проекта, а не с innerWidth:
 * на телефоне браузер расширяет innerWidth под слишком широкий документ, и ошибка пряталась.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const vw = page.viewportSize()!.width;
  const r = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(r.sw, `ширина документа ${r.sw} > окна ${vw}`).toBeLessThanOrEqual(Math.min(vw, r.cw) + 1);
}

/** Все острова Astro на странице загрузились (атрибут ssr снимается после гидратации) */
export async function expectIslandsHydrated(page: Page) {
  await expect.poll(async () => page.locator('astro-island[ssr]').count(), { timeout: 15_000 }).toBe(0);
}

/** Мобильный проект (ширина меньше 768) */
export const isMobile = (page: Page) => page.viewportSize()!.width < 768;

// ============ Список страниц ============

/** Обязательный набор страниц (есть всегда, даже без сборки) */
export const KEY_PAGES = [
  '/', '/courses-page/visualization', '/courses-page/interior', '/courses-page/exterior', '/courses-page/stocks', '/courses-page/3ds-max',
  '/courses', '/interiorpro', '/exteriorpro', '/modeling1', '/1-2-3lvl', '/vizualization3_mini', '/uslugi_nastavnik',
  '/ai', '/gallery', '/otzyvy', '/stories/bolshunova', '/blog', '/blog/kompyuter-dlya-3ds-max-i-corona', '/oferta', '/yur',
];
export const NOT_FOUND = '/404-несуществующая';

/** Все страницы из dist/client (после `npm run build`) плюс обязательный набор */
export function allPages(): string[] {
  const root = path.resolve(process.cwd(), 'dist/client');
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) { if (e.name !== '_astro' && e.name !== 'keystatic') walk(path.join(dir, e.name)); }
      else if (e.name.endsWith('.html')) found.push(path.join(dir, e.name).slice(root.length).replace(/\.html$/, ''));
    }
  };
  try { walk(root); } catch { /* сборки нет: только обязательный набор */ }
  // /design/*: черновики дизайнера, в сайт не входят
  const pages = found.map((p) => (p === '/index' ? '/' : p)).filter((p) => p !== '/404' && !p.startsWith('/design/'));
  return [...new Set([...KEY_PAGES, ...pages])].sort();
}

// ============ Проверки страницы ============

/** Прокрутить страницу до конца и обратно, чтобы загрузились ленивые картинки */
export async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

/**
 * Битые картинки: загрузка закончилась, а размера нет. Картинки в скрытых вкладках (display: none) не грузятся, их пропускаем.
 * scope: проверить только картинки внутри блока (их прокручиваем в окно, чтобы сработала ленивая загрузка)
 */
export async function expectNoBrokenImages(page: Page, scope?: Locator) {
  if (scope) {
    for (const img of await scope.locator('img').all()) {
      if (await img.isVisible()) { await img.scrollIntoViewIfNeeded(); await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete), { timeout: 15_000 }).toBe(true); }
    }
  }
  const root = scope ? await scope.elementHandle() : null;
  await page.waitForFunction((r) => [...(r ?? document).querySelectorAll('img')]
    .filter((i) => i.getAttribute('src') && i.getClientRects().length > 0)
    .every((i) => i.complete), root, { timeout: 20_000 }).catch(() => {});
  const broken = await page.evaluate((r) => [...(r ?? document).querySelectorAll('img')]
    .filter((i) => i.getAttribute('src') && i.getClientRects().length > 0)
    .filter((i) => !i.complete || i.naturalWidth === 0)
    .map((i) => (i.complete ? 'битая: ' : 'не загрузилась: ') + (i.currentSrc || i.src).slice(0, 160)), root);
  expect(broken, broken.join('\n')).toEqual([]);
}

/**
 * Элементы и строки текста, которые вылезают за край окна и не обрезаны родителем
 * (лента с overflow-x: auto или блок с overflow: hidden свои края обрезает, это нормально).
 */
export async function findOffscreen(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const out = (r: DOMRect) => r.right > vw + 1 || r.left < -1;
    const clippedBy = (el: Element | null) => {
      for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX !== 'visible' || cs.clipPath !== 'none') {
          const r = a.getBoundingClientRect();
          if (!out(r)) return true;
        }
        if (cs.position === 'fixed') return false;
      }
      return false;
    };
    const skip = (el: Element) => el.closest('dialog:not([open]), [hidden], .sr-only, .skip-link, [aria-hidden="true"][inert]');
    const name = (el: Element) => `<${el.tagName.toLowerCase()} class="${String(el.getAttribute('class') ?? '').slice(0, 60)}">`;
    const res: string[] = [];
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || !out(r) || skip(el)) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      if (clippedBy(el.parentElement)) continue;
      res.push(`${name(el)} left ${Math.round(r.left)}, right ${Math.round(r.right)}: «${(el.textContent ?? '').trim().slice(0, 40)}»`);
    }
    // Длинные слова вылезают из блока строкой текста, при этом сам блок в пределах окна
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const n = walker.currentNode as Text;
      const p = n.parentElement;
      if (!p || !n.textContent?.trim() || skip(p) || clippedBy(p)) continue;
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (r.width && out(r)) { res.push(`текст в ${name(p)} right ${Math.round(r.right)}: «${n.textContent.trim().slice(0, 40)}»`); break; }
      }
    }
    return res;
  });
}

/** Вложенные контейнеры с вертикальной прокруткой (двойная прокрутка) */
export async function findNestedVerticalScrollers(page: Page): Promise<string[]> {
  return page.evaluate(() => [...document.body.querySelectorAll('*')]
    .filter((el) => {
      const cs = getComputedStyle(el);
      return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 1
        && el.getClientRects().length > 0 && !el.closest('dialog');
    })
    .map((el) => `<${el.tagName.toLowerCase()} class="${String(el.getAttribute('class') ?? '').slice(0, 60)}"> ${el.scrollHeight}/${el.clientHeight}`));
}

/**
 * Что перекрывает элемент: проверяем несколько точек внутри него через elementFromPoint.
 * Возвращает описание перекрывающего элемента или null.
 */
export async function coveredBy(target: Locator): Promise<string | null> {
  return target.evaluate((el) => {
    const r = el.getBoundingClientRect();
    const vh = window.innerHeight, vw = document.documentElement.clientWidth;
    const pts: [number, number][] = [[0.5, 0.5], [0.15, 0.5], [0.85, 0.5], [0.5, 0.2], [0.5, 0.8]];
    for (const [fx, fy] of pts) {
      const x = r.left + r.width * fx, y = r.top + r.height * fy;
      if (x < 0 || y < 0 || x >= vw || y >= vh) continue;
      const hit = document.elementFromPoint(x, y);
      if (!hit || el.contains(hit) || hit.contains(el)) continue;
      // Перекрытие считаем только фиксированными и липкими слоями
      for (let a: Element | null = hit; a; a = a.parentElement) {
        const pos = getComputedStyle(a).position;
        if (pos === 'fixed' || pos === 'sticky') return `<${a.tagName.toLowerCase()} id="${a.id}" class="${String(a.getAttribute('class') ?? '').slice(0, 50)}">`;
      }
    }
    return null;
  });
}

/** Дождаться окончания плавной прокрутки */
export async function waitScrollEnd(page: Page) {
  let last = -1, same = 0;
  for (let i = 0; i < 60 && same < 4; i++) {
    const y = await page.evaluate(() => window.scrollY);
    same = y === last ? same + 1 : 0;
    last = y;
    await page.waitForTimeout(50);
  }
}

/**
 * Положение заголовка относительно липких слоёв сверху (подменю разделов):
 * нижняя граница самого низкого липкого слоя у верха окна, если он над заголовком
 */
export async function headingClearOfSticky(heading: Locator) {
  return heading.evaluate((h) => {
    const r = h.getBoundingClientRect();
    const sticky = [...document.querySelectorAll<HTMLElement>('body *')].filter((el) => {
      const cs = getComputedStyle(el);
      if (cs.position !== 'sticky' && cs.position !== 'fixed') return false;
      if (el.contains(h) || cs.visibility === 'hidden' || el.closest('[aria-hidden="true"]')) return false;
      const sr = el.getBoundingClientRect();
      // Слой у верхнего края окна и не выше половины экрана (не колонка FAQ и не панель снизу)
      return sr.height > 0 && sr.top < window.innerHeight / 3 && sr.bottom > 0 && sr.height < window.innerHeight / 3 && sr.top <= r.top;
    });
    const stickyBottom = Math.max(0, ...sticky.map((s) => s.getBoundingClientRect().bottom));
    return { top: r.top, bottom: r.bottom, stickyBottom, vh: window.innerHeight };
  });
}

/** Прикрепить список к отчёту и вывести в консоль */
export async function attachList(testInfo: TestInfo, name: string, list: string[]) {
  if (!list.length) return;
  await testInfo.attach(name, { body: list.join('\n'), contentType: 'text/plain' });
}
