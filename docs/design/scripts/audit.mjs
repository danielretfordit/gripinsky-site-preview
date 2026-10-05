// Аудит вёрстки: скриншоты и замеры ритма на 375 / 768 / 1024 / 1440.
// Запуск: node docs/design/scripts/audit.mjs [--only=/path] [--no-shots]
// Результат: docs/design/shots/audit/*.png и docs/design/shots/audit/metrics.json
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { prepare, hideFixedBottom } from './audit-lib.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:4321';
const OUT = 'docs/design/shots/audit';
const WIDTHS = [375, 768, 1024, 1440];
const HEIGHT = { 375: 812, 768: 1024, 1024: 768, 1440: 900 };
const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const PAGES = args.only ? [args.only] : ['/', '/courses-page/visualization', '/courses-page/interior', '/courses', '/interiorpro', '/ai', '/gallery', '/otzyvy'];
const slug = (p) => (p === '/' ? 'home' : p.replace(/^\//, '').replace(/\//g, '_'));

mkdirSync(OUT + '/viz-sections', { recursive: true });

function measure() {
  const px = (v) => Math.round(parseFloat(v) || 0);
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.height > 0 && r.width > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
  const absTop = (el) => el.getBoundingClientRect().top + scrollY;
  const absBottom = (el) => el.getBoundingClientRect().bottom + scrollY;
  const label = (el) => {
    const id = el.id ? `#${el.id}` : '';
    const lab = el.getAttribute('aria-labelledby') ? `[${el.getAttribute('aria-labelledby')}]` : '';
    const al = el.getAttribute('aria-label') ? `"${el.getAttribute('aria-label').slice(0, 30)}"` : '';
    const h = el.querySelector('h1,h2');
    return `${el.tagName.toLowerCase()}${id}${lab}${al} ${h ? '«' + h.textContent.trim().replace(/\s+/g, ' ').slice(0, 40) + '»' : ''}`.trim();
  };
  // Контент секции: границы потомков в потоке (без absolute фонов)
  // Видимый контент секции: всё, что реально рисуется (текст, картинки, подложки, рамки), без декоративных absolute-фонов
  const contentBox = (sec) => {
    let top = Infinity, bottom = -Infinity;
    const cs0 = getComputedStyle(sec);
    if (cs0.backgroundColor !== 'rgba(0, 0, 0, 0)') return { top: absTop(sec), bottom: absBottom(sec) };
    for (const el of sec.querySelectorAll('*')) {
      if (['SCRIPT', 'STYLE', 'TEMPLATE'].includes(el.tagName)) continue;
      const r = el.getBoundingClientRect();
      if (r.height <= 0 || r.width <= 0) continue;
      if (el.closest('details:not([open])') && !el.closest('summary')) continue;
      const cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || cs.opacity === '0') continue;
      if (cs.position === 'absolute' && (el.getAttribute('aria-hidden') === 'true' || el.closest('[aria-hidden="true"]') || (el.tagName === 'IMG' && el.alt === ''))) continue;
      const paints = ['IMG', 'SVG', 'svg', 'INPUT', 'BUTTON', 'VIDEO', 'CANVAS', 'TEXTAREA', 'SELECT'].includes(el.tagName)
        || cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none'
        || px(cs.borderTopWidth) > 0 || px(cs.borderBottomWidth) > 0 || cs.boxShadow !== 'none' && false
        || [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!paints) continue;
      let t = r.top, b = r.bottom;
      // Для текстовых узлов берём строки, а не бокс с отступами
      if (!['IMG', 'SVG', 'svg'].includes(el.tagName) && cs.backgroundColor === 'rgba(0, 0, 0, 0)' && px(cs.borderTopWidth) === 0 && px(cs.borderBottomWidth) === 0) {
        t += px(cs.paddingTop); b -= px(cs.paddingBottom);
      }
      if (px(cs.borderTopWidth) > 0 && px(cs.borderBottomWidth) === 0 && cs.backgroundColor === 'rgba(0, 0, 0, 0)') {
        // линия-разделитель сверху: считаем только её
        top = Math.min(top, r.top + scrollY);
      }
      top = Math.min(top, t + scrollY); bottom = Math.max(bottom, b + scrollY);
    }
    if (px(cs0.borderTopWidth) > 0) top = Math.min(top, absTop(sec));
    return { top, bottom };
  };

  const main = document.querySelector('main');
  // Секции: прямые потомки main и потомки-секции обёрток без отступов
  let secs = [...main.children].filter((e) => vis(e) && !['SCRIPT', 'STYLE'].includes(e.tagName));
  secs = secs.flatMap((e) => (e.tagName === 'DIV' && e.querySelector(':scope > section') && px(getComputedStyle(e).paddingTop) === 0 ? [...e.children].filter(vis) : [e]));
  const sections = secs.map((s) => {
    const cs = getComputedStyle(s);
    const cb = contentBox(s);
    return { label: label(s), top: Math.round(absTop(s)), height: Math.round(s.getBoundingClientRect().height), pt: px(cs.paddingTop), pb: px(cs.paddingBottom), mt: px(cs.marginTop), contentTop: Math.round(cb.top), contentBottom: Math.round(cb.bottom), border: px(cs.borderTopWidth) ? 'border-top' : '' };
  });
  sections.forEach((s, i) => {
    const n = sections[i + 1];
    s.gapToNext = n ? n.contentTop - s.contentBottom : null; // видимый зазор между последним и первым видимым элементом
    s.cssGap = n ? s.pb + n.pt + n.mt : null; // сумма отступов секций по CSS
  });

  // Заголовок секции → первый контент
  const heads = [...main.querySelectorAll('h2')].filter(vis).map((h) => {
    let node = h;
    const sec = h.closest('section') ?? main;
    while (node.parentElement && node.parentElement !== sec && !node.nextElementSibling) node = node.parentElement;
    // Поднимаемся до группы «надзаголовок + h2 + лид»
    while (node.parentElement && node.parentElement !== sec && node.parentElement.children.length <= 4 && !node.nextElementSibling) node = node.parentElement;
    let next = node.nextElementSibling;
    while (next && !vis(next)) next = next.nextElementSibling;
    const nb = node.getBoundingClientRect();
    return { h2: h.textContent.trim().replace(/\s+/g, ' ').slice(0, 44), fontSize: px(getComputedStyle(h).fontSize), left: Math.round(h.getBoundingClientRect().left), headToContent: next ? Math.round(next.getBoundingClientRect().top - nb.bottom) : null };
  });

  // Карточки и плашки: внутренние поля и радиусы
  const cards = [...main.querySelectorAll('.card, .panel, [class*="rounded-"]')].filter((e) => {
    if (!vis(e)) return false;
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return r.width > 160 && r.height > 80 && (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || px(cs.borderTopWidth) > 0 || cs.backgroundImage !== 'none') && e.tagName !== 'IMG' && e.tagName !== 'A' || (e.tagName === 'A' && e.classList.contains('card'));
  }).map((e) => {
    const cs = getComputedStyle(e);
    let pad = [px(cs.paddingTop), px(cs.paddingRight), px(cs.paddingBottom), px(cs.paddingLeft)];
    let via = '';
    if (pad.every((p) => p === 0)) {
      const inner = [...e.querySelectorAll(':scope > div, :scope > span')].find((d) => px(getComputedStyle(d).paddingLeft) > 0);
      if (inner) { const ic = getComputedStyle(inner); pad = [px(ic.paddingTop), px(ic.paddingRight), px(ic.paddingBottom), px(ic.paddingLeft)]; via = ' (внутр.)'; }
    }
    const sec = e.closest('section');
    return { in: sec ? (sec.id || sec.getAttribute('aria-labelledby') || sec.getAttribute('aria-label') || '?') : 'main', cls: (e.className.baseVal ?? e.className).toString().split(/\s+/).filter((c) => /card|panel|rounded|p-|px-|py-|pb-|pt-|bg-|border/.test(c)).slice(0, 8).join(' '), pad: pad.join('/') + via, radius: px(cs.borderTopLeftRadius), w: Math.round(e.getBoundingClientRect().width) };
  });

  // Поля контейнера
  const wraps = [...document.querySelectorAll('.wrap')].filter(vis).map((w) => px(getComputedStyle(w).paddingLeft));
  const lefts = [...main.querySelectorAll('h1,h2')].filter(vis).map((h) => Math.round(h.getBoundingClientRect().left));

  // Размеры шрифтов
  const sizes = {};
  for (const el of document.body.querySelectorAll('*')) {
    if (!vis(el)) continue;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!hasText) continue;
    const cs = getComputedStyle(el);
    const k = `${Math.round(parseFloat(cs.fontSize) * 10) / 10}`;
    sizes[k] = (sizes[k] ?? 0) + 1;
  }
  const radii = {};
  for (const el of main.querySelectorAll('*')) {
    const r = px(getComputedStyle(el).borderTopLeftRadius);
    if (r > 0 && vis(el)) radii[r] = (radii[r] ?? 0) + 1;
  }

  // Длина строки у абзацев
  const longLines = [...main.querySelectorAll('p, blockquote, li')].filter(vis).map((p) => {
    const cs = getComputedStyle(p); const w = p.getBoundingClientRect().width; const fs = parseFloat(cs.fontSize);
    return { text: p.textContent.trim().slice(0, 50), w: Math.round(w), fs, chars: Math.round(w / (fs * 0.52)) };
  }).filter((x) => x.chars > 90 && x.text.length > 120).slice(0, 8);

  // Цели касания меньше 44
  const small = [...document.querySelectorAll('a, button, summary, input:not([type=hidden]), [role=tab], [role=radio]')].filter(vis).filter((e) => {
    const r = e.getBoundingClientRect();
    const inText = e.tagName === 'A' && e.closest('p, li, dd, dt, span.t-small, figcaption, blockquote');
    return !inText && (r.height < 44 || r.width < 44) && getComputedStyle(e).opacity !== '0';
  }).map((e) => `${e.tagName.toLowerCase()} ${Math.round(e.getBoundingClientRect().width)}×${Math.round(e.getBoundingClientRect().height)} «${(e.textContent || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 28)}»`);

  const overflowX = document.documentElement.scrollWidth > innerWidth;
  return { pageHeight: document.documentElement.scrollHeight, screens: Math.round((document.documentElement.scrollHeight / innerHeight) * 10) / 10, overflowX, wraps: [...new Set(wraps)], headingLefts: [...new Set(lefts)], sections, heads, cards, fontSizes: sizes, radii, longLines, smallTargets: small.slice(0, 30), smallTargetsCount: small.length };
}

const browser = await chromium.launch();
const all = {};
for (const p of PAGES) {
  all[p] = {};
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: HEIGHT[w] }, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 });
    const page = await ctx.newPage();
    try {
      await prepare(page, BASE + p);
      all[p][w] = await page.evaluate(measure);
      if (args['no-shots'] === undefined) {
        await page.screenshot({ path: `${OUT}/${slug(p)}-${w}-first.png` });
        await hideFixedBottom(page, true);
        await page.screenshot({ path: `${OUT}/${slug(p)}-${w}-full.png`, fullPage: true });
        await hideFixedBottom(page, false);
        // Страница направления: каждая секция отдельным снимком на 375 и 1440
        if (p === '/courses-page/visualization' && (w === 375 || w === 1440)) {
          await hideFixedBottom(page, true);
          const secs = await page.$$('main > section, main > nav, main > div > section, main > div:not(:has(section))');
          let i = 0;
          for (const s of secs) {
            const box = await s.boundingBox();
            if (!box || box.height < 20) continue;
            const id = (await s.getAttribute('id')) ?? (await s.getAttribute('aria-labelledby')) ?? 'block';
            await s.screenshot({ path: `${OUT}/viz-sections/${w}-${String(++i).padStart(2, '0')}-${id}.png` }).catch(() => null);
          }
          await hideFixedBottom(page, false);
        }
      }
      console.log('ok', p, w, all[p][w].pageHeight);
    } catch (e) {
      console.log('fail', p, w, e.message);
    }
    await ctx.close();
  }
}
await browser.close();
writeFileSync(`${OUT}/metrics${args.only ? '-' + slug(args.only) : ''}.json`, JSON.stringify(all, null, 1));
