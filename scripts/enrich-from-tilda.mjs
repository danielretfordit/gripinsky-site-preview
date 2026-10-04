// Дополняет записи курсов текстами со старых страниц Tilda (docs/tilda/pages/*.txt, их собирает import-tilda --pages).
// Заполняет только пустые поля lessons и level. Ручные правки не перезаписываются.
// Описания автоматически не берём: на страницах Tilda рядом с текстом курса стоят отзывы из чатов,
// эвристика их не отличает. Описания пишем вручную в Keystatic.
// Запуск: node scripts/enrich-from-tilda.mjs
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';

const PAGES = 'docs/tilda/pages';
const COURSES = 'src/content/courses';

const texts = Object.fromEntries(readdirSync(PAGES).map((f) => [f.replace(/\.txt$/, ''), readFileSync(`${PAGES}/${f}`, 'utf8')]));

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

let changed = 0;
for (const f of readdirSync(COURSES)) {
  const file = `${COURSES}/${f}`;
  const c = JSON.parse(readFileSync(file, 'utf8'));
  const slug = (c.legacyPath || '').slice(1).replace(/\//g, '--');
  const t = texts[slug];
  if (!t) continue;
  let dirty = false;

  const videos = t.match(/КОЛИЧЕСТВО ВИДЕО:\s*(\d+)/);
  // У пакетов на странице несколько курсов: первое число относится к одному из них
  if (!c.lessons && videos && c.type !== 'package') { c.lessons = Number(videos[1]); dirty = true; }
  const level = t.match(/УРОВЕНЬ ПОДГОТОВКИ:\s*([А-ЯЁA-Z ,]+)/);
  if (!c.level && level) { c.level = cap(level[1].trim()); dirty = true; }

  if (dirty) { writeFileSync(file, JSON.stringify(c, null, 2) + '\n'); changed++; }
}
console.log(`Дополнено записей: ${changed}`);
