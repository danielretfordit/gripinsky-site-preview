import { test, expect, type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

// Ключевые шаблоны сайта: по одной-две страницы каждого типа.
export const VISUAL_PAGES: [name: string, path: string][] = [
  ['home', '/'],
  ['direction', '/courses-page/visualization'],
  ['profession', '/courses-page/interior'],
  ['category', '/courses-page/3ds-max'],
  ['catalog', '/courses'],
  ['course', '/vizualization3'],
  ['course-pro', '/interiorpro'],
  ['ai', '/ai'],
  ['gamedev', '/courses-page/gamedev'],
  ['gallery', '/gallery'],
  ['reviews', '/otzyvy'],
  ['story', '/stories/bolshunova'],
  ['club', '/club'],
  ['teachers', '/teachers'],
  ['blog', '/blog'],
  ['article', '/blog/kompyuter-dlya-3ds-max-i-corona'],
  ['legal', '/oferta'],
  ['404', '/404-несуществующая'],
];

const AUDIT_DIR = path.resolve('e2e-report/visual-audit');
const STRICT = !!process.env.AUDIT_STRICT;
/** AUDIT_ONLY=1: только аудит раскладки, без снимков (быстро) */
const AUDIT_ONLY = !!process.env.AUDIT_ONLY;

async function prepare(page: Page) {
  await page.addInitScript(() => {
    try { localStorage.setItem('gr-cookie-consent', 'necessary'); } catch {}
  });
}

/** Догрузить ленивые картинки, дождаться шрифтов и вернуться наверх */
async function settle(page: Page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise((r) => setTimeout(r, 40));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
    const imgs = [...document.images].filter((i) => i.loading !== 'lazy' || i.getBoundingClientRect().top < document.documentElement.scrollHeight);
    await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); }))));
  });
  await page.waitForTimeout(300);
}

/** Аудит раскладки: горизонтальная прокрутка, вылезающий текст, обрезанные заголовки, мелкие цели касания */
async function audit(page: Page, mobile: boolean) {
  return page.evaluate((mobile) => {
    const vw = document.documentElement.clientWidth;
    const out = { overflowDoc: 0, offscreen: [] as string[], clipped: [] as string[], smallTargets: [] as string[] };
    out.overflowDoc = Math.max(0, document.documentElement.scrollWidth - vw);
    const label = (el: Element) => {
      const t = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 40);
      const where = el.closest('header') ? 'шапка' : el.closest('footer') ? 'подвал' : el.closest('section[id]')?.id || el.closest('section, aside, form')?.className.toString().split(' ')[0] || 'страница';
      return `${where}: <${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.split(' ')[0] : ''}> «${t}»`;
    };
    const visible = (el: Element) => {
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return false;
      if (el.closest('[hidden], dialog:not([open]), [aria-hidden="true"], .sr-only, .skip-link, details:not([open]) > :not(summary)')) return false;
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    // Ближайший предок, который обрезает или прокручивает по горизонтали
    const clipAncestor = (el: Element) => {
      for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
        const ox = getComputedStyle(p).overflowX;
        if (ox !== 'visible') return { el: p, scrolls: ox === 'auto' || ox === 'scroll' };
      }
      return null;
    };
    for (const el of document.querySelectorAll('main p, main h1, main h2, main h3, main h4, main li, main a, main button, main span, header a, header button, footer a, footer p')) {
      if (!visible(el)) continue;
      // Текст: меряем реальные строки (Range), а не блок
      const rects: DOMRect[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (!n.textContent?.trim() || n.parentElement?.closest('.sr-only, [hidden], [aria-hidden="true"]')) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        rects.push(...[...range.getClientRects()].filter((r) => r.width > 0));
      }
      const r = rects.length ? { left: Math.min(...rects.map((x) => x.left)), right: Math.max(...rects.map((x) => x.right)) } : el.getBoundingClientRect();
      const anc = clipAncestor(el);
      if (anc?.scrolls) continue; // ленты и карусели прокручиваются намеренно
      const box = anc ? anc.el.getBoundingClientRect() : { left: 0, right: vw };
      const right = Math.min(box.right, vw), left = Math.max(box.left, 0);
      if (r.right > right + 1 || r.left < left - 1) {
        // Скрытые слайды и элементы, целиком вне обрезки, не считаем
        if (r.left >= right || r.right <= left) continue;
        out.offscreen.push(`${label(el)} ${Math.round(r.left)}..${Math.round(r.right)} из ${Math.round(left)}..${Math.round(right)}`);
      }
    }
    for (const el of document.querySelectorAll('h1, h2, h3, .btn, p')) {
      if (!visible(el)) continue;
      const he = el as HTMLElement;
      if (he.scrollWidth > he.clientWidth + 1 && getComputedStyle(he).overflowX !== 'visible') out.clipped.push(`${label(el)} ${he.scrollWidth}>${he.clientWidth}`);
    }
    if (mobile) {
      for (const el of document.querySelectorAll<HTMLElement>('a[href], button, summary, [role="tab"], input:not([type="hidden"]), select')) {
        if (!visible(el)) continue;
        const cs = getComputedStyle(el);
        // Поле внутри подписи: нажимают на подпись
        const owner = el.matches('input') ? el.closest('label') : null;
        const r = (owner ?? el).getBoundingClientRect();
        // Заголовок карточки, когда вся карточка уже ссылка
        if (el.tagName === 'A' && el.closest('article')?.querySelector(':scope a[tabindex="-1"][class*="absolute"], :scope > a.absolute')) continue;
        const before = getComputedStyle(el, '::before');
        const hitH = before.content !== 'none' && before.position === 'absolute' ? Math.max(r.height, parseFloat(before.height) || 0) : r.height;
        const hitW = before.content !== 'none' && before.position === 'absolute' ? Math.max(r.width, parseFloat(before.width) || 0) : r.width;
        if (hitH >= 43.5 && hitW >= 43.5) continue;
        const after = getComputedStyle(el, '::after');
        if (after.position === 'absolute' && after.content !== 'none') continue;
        const block = el.parentElement?.closest('p, li, label, dd, td');
        if (el.tagName === 'A' && cs.display === 'inline' && block && (block.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 2) continue;
        out.smallTargets.push(`${label(el)} ${Math.round(hitW)}×${Math.round(hitH)}`);
      }
    }
    return out;
  }, mobile);
}

for (const [name, url] of VISUAL_PAGES) {
  test(`${name} ${url}`, async ({ page }, info) => {
    const mobile = page.viewportSize()!.width < 768;
    await prepare(page);
    const res = await page.goto(url, { waitUntil: 'networkidle' });
    expect(res?.status(), 'статус страницы').toBeLessThan(name === '404' ? 500 : 400);
    await settle(page);

    const report = await audit(page, mobile);
    fs.mkdirSync(AUDIT_DIR, { recursive: true });
    fs.writeFileSync(path.join(AUDIT_DIR, `${info.project.name}__${name}.json`), JSON.stringify({ project: info.project.name, page: url, ...report }, null, 2));
    if (STRICT) {
      expect.soft(report.overflowDoc, 'горизонтальная прокрутка').toBe(0);
      expect.soft(report.offscreen, 'элементы за краем экрана').toEqual([]);
      expect.soft(report.clipped, 'обрезанный текст').toEqual([]);
      expect.soft(report.smallTargets, 'цели касания меньше 44 px').toEqual([]);
    }

    if (AUDIT_ONLY) return;
    await expect(page).toHaveScreenshot(`${name}.png`, {
      fullPage: true,
      mask: [page.locator('video'), page.locator('[data-visual-mask]')],
      timeout: 60_000,
    });
  });
}
