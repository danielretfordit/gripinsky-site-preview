import { test, expect } from '@playwright/test';
import { allPages } from './helpers';

// Все внутренние ссылки на всех страницах ведут на живые страницы, якоря существуют.
// Разметка не зависит от ширины, поэтому проверка идёт один раз (в проекте desktop-1440).
// Ссылки на прежний сайт gripinsky.ru допустимы и не проверяются (туда ведут ещё не перенесённые разделы).
const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

test('внутренние ссылки и якоря на всех страницах', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop-1440', 'разметка одна для всех ширин');
  test.setTimeout(180_000);
  const pages = allPages();
  const html = new Map<string, string>();
  const get = async (path: string) => {
    if (!html.has(path)) {
      const res = await request.get(path, { maxRedirects: 5 });
      html.set(path, res.ok() ? await res.text() : `__STATUS_${res.status()}`);
    }
    return html.get(path)!;
  };
  const ids = (doc: string) => new Set([...doc.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const problems: string[] = [];
  const checked = new Map<string, string | null>();

  for (const page of pages) {
    const doc = await get(page);
    expect(doc.startsWith('__STATUS_'), `страница ${page} не открылась`).toBe(false);
    const hrefs = [...new Set([...doc.matchAll(/<a\s[^>]*?href="([^"]*)"/g)].map((m) => decode(m[1])))];
    for (const href of hrefs) {
      if (!href) { problems.push(`${page}: пустой href`); continue; }
      if (/^(mailto:|tel:)/.test(href)) continue;
      if (/^https?:\/\//.test(href)) {
        if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(href)) problems.push(`${page}: абсолютная ссылка на localhost ${href}`);
        continue;
      }
      const [pathAndQuery, hash] = href.split('#');
      const path = (pathAndQuery || page).split('?')[0];
      if (!path.startsWith('/')) { problems.push(`${page}: относительная ссылка ${href}`); continue; }
      if (path !== '/' && path.endsWith('/')) problems.push(`${page}: слэш на конце ${href}`);
      if (!checked.has(path)) {
        const res = await request.get(path, { maxRedirects: 5 });
        checked.set(path, res.ok() ? null : `HTTP ${res.status()}`);
        if (res.ok() && !html.has(path)) html.set(path, await res.text());
      }
      const err = checked.get(path);
      if (err) { problems.push(`${page}: ${href} → ${err}`); continue; }
      if (hash && !ids(html.get(path) ?? '').has(decodeURIComponent(hash))) problems.push(`${page}: якорь ${href} не найден на ${path}`);
    }
  }
  await testInfo.attach('проверено адресов', { body: [...checked.keys()].sort().join('\n'), contentType: 'text/plain' });
  expect(problems, problems.join('\n')).toEqual([]);
});
