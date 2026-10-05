import { test, expect } from '@playwright/test';
import { noCookieBanner, expectIslandsHydrated, isMobile, KEY_PAGES } from './helpers';

// Цели касания на телефоне: интерактивные элементы не меньше 44×44.
// Исключение по WCAG 2.5.8: ссылка внутри строки текста (в предложении). Такие нарушения
// собираются в отчёт (вложение «мелкие ссылки в тексте»), но тест не валят.
const MIN = 44;

for (const path of KEY_PAGES) {
  test(`цели касания ${path}`, async ({ page }, testInfo) => {
    test.skip(!isMobile(page), 'проверяется на телефоне');
    await noCookieBanner(page);
    await page.goto(path);
    await expectIslandsHydrated(page);
    const res = await page.evaluate((MIN) => {
      const out: { control: string[]; inline: string[] } = { control: [], inline: [] };
      const els = document.querySelectorAll<HTMLElement>('a[href], button, select, input:not([type="hidden"]), summary, [role="tab"], [role="radio"], [tabindex="0"]');
      const seen = new Set<Element>();
      for (const el0 of els) {
        let el: HTMLElement = el0;
        // Скрытый чекбокс оформлен подписью: меряем подпись
        if (el.matches('input.sr-only')) el = el.closest('label') ?? el;
        if (seen.has(el)) continue;
        seen.add(el);
        if (el.closest('[hidden], dialog:not([open]), [aria-hidden="true"], .sr-only:not(input), .skip-link') || el.matches('.sr-only')) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        // Невидимая зона нажатия из global.css (::before поверх ссылки)
        const before = getComputedStyle(el, '::before');
        const hitW = before.content !== 'none' && before.position === 'absolute' ? Math.max(r.width, parseFloat(before.width) || 0) : r.width;
        const hitH = before.content !== 'none' && before.position === 'absolute' ? Math.max(r.height, parseFloat(before.height) || 0) : r.height;
        if (hitW >= MIN - 0.5 && hitH >= MIN - 0.5) continue;
        // Вместо размера самой ссылки учитываем растянутую на карточку ссылку (after:absolute)
        const after = getComputedStyle(el, '::after');
        if (after.position === 'absolute' && after.content !== 'none') continue;
        const text = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
        const where = el.closest('header') ? 'шапка' : el.closest('footer') ? 'подвал' : el.closest('nav[aria-label="Хлебные крошки"]') ? 'крошки' : el.closest('section[id], form, aside')?.id || 'страница';
        const line = `${where}: <${el.tagName.toLowerCase()}> «${text}» ${Math.round(hitW)}×${Math.round(hitH)}`;
        // Ссылка внутри предложения: у родителя есть текст помимо самой ссылки
        const block = el.parentElement!.closest('p, li, span, label, dd, dt, td, div')!;
        const inlineText = el.tagName === 'A' && cs.display === 'inline' && (block.textContent ?? '').trim().length > (el.textContent ?? '').trim().length + 2;
        (inlineText ? out.inline : out.control).push(line);
      }
      return out;
    }, MIN);
    if (res.inline.length) await testInfo.attach('мелкие ссылки в тексте', { body: res.inline.join('\n'), contentType: 'text/plain' });
    if (res.control.length) await testInfo.attach('мелкие элементы управления', { body: res.control.join('\n'), contentType: 'text/plain' });
    expect(res.control, `меньше ${MIN}×${MIN}:\n${res.control.join('\n')}`).toEqual([]);
  });
}
