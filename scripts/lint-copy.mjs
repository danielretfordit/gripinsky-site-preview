// Проверка текстов собранного сайта по правилам брифа (docs/HANDOFF.md §4.6 и CLAUDE.md).
// Запуск после сборки: npm run build && npm run lint:copy
// Не проверяем: ссылки (там стрелки допустимы), цитаты (blockquote, .t-hand), полные истории учеников, юридические документы.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = 'dist/client';
// Legacy Title is preserved only when it matches the archive for the same route.
const legacyPages = JSON.parse(readFileSync('docs/tilda/pages.json', 'utf8'));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#(?:39|x27);/gi, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const preserveLegacyTitle = (html, file) => {
  const route = file.slice(ROOT.length).replace(/\.html$/, '').replace(/^\/index$/, '/');
  return html.replace(/<title>([\s\S]*?)<\/title>/, (tag, title) =>
    decode(title) === legacyPages[route]?.title ? '' : tag);
};
const SKIP_PAGES = ['oferta.html', 'politica.html', 'soglasie.html'];
// Статьи старого блога (/tpost/…) перенесены как авторские тексты; править их или нет, решает заказчица (docs/open-questions.md)
const SKIP_DIRS = ['/tpost/'];
const files = [];
const walk = (d) => { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : f.endsWith('.html') && files.push(p); } };
walk(ROOT);

const RULES = [
  { re: /\s[—–]\s/g, msg: 'длинное тире с пробелами' },
  { re: /\s·\s/g, msg: 'точка-разделитель «·»' },
  { re: /→/g, msg: 'стрелка «→» вне ссылки' },
  { re: /налогов\S* вычет/gi, msg: 'упоминание налогового вычета' },
  { re: /гаранти\S* трудоустройств/gi, msg: 'гарантия трудоустройства' },
  { re: /\bдиплом\S*/gi, msg: 'слово «диплом»' },
  { re: /\[[^\]]{2,60}\]/g, msg: 'плейсхолдер в квадратных скобках', warn: true },
];

const strip = (html) => html
  .replace(/<script[\s\S]*?<\/script>/g, '')
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<a\b[\s\S]*?<\/a>/g, '')
  // Кнопки и подписи-призывы внутри карточек-ссылок (data-cta) считаются ссылками
  .replace(/<button\b[\s\S]*?<\/button>/g, '')
  .replace(/<span[^>]*data-cta[^>]*>[\s\S]*?<\/span>/g, '')
  .replace(/<blockquote[\s\S]*?<\/blockquote>/g, '')
  .replace(/<(\w+)[^>]*class="[^"]*\b(t-hand|story-body|prose-story)\b[^"]*"[^>]*>[\s\S]*?<\/\1>/g, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<[^>]+>/g, '\n')
  .replace(/&nbsp;|&#160;/g, ' ')
  .replace(/&quot;/g, '"')
  .replace(/&amp;/g, '&');

let errors = 0, warnings = 0;
for (const f of files) {
  if (SKIP_PAGES.some((s) => f.endsWith(s)) || SKIP_DIRS.some((d) => f.includes(d))) continue;
  const text = strip(preserveLegacyTitle(readFileSync(f, 'utf8'), f));
  for (const r of RULES) {
    const lines = text.split('\n').filter((l) => r.re.test(l));
    r.re.lastIndex = 0;
    for (const l of [...new Set(lines)].slice(0, 5)) {
      console.log(`${r.warn ? 'предупреждение' : 'ошибка'}: ${f.replace(ROOT, '')}: ${r.msg}: «${l.trim().slice(0, 110)}»`);
      r.warn ? warnings++ : errors++;
    }
  }
}
console.log(`\nПроверено страниц: ${files.length}. Ошибок: ${errors}, предупреждений: ${warnings}.`);
process.exitCode = errors ? 1 : 0;
