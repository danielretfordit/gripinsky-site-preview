// Сводка аудита раскладки после `npm run visual`: какие страницы на каких ширинах ломаются.
// Запуск: node scripts/visual-audit-summary.mjs [--md путь]  (по умолчанию печатает в консоль)
import fs from 'node:fs';
import path from 'node:path';

const dir = path.resolve('e2e-report/visual-audit');
if (!fs.existsSync(dir)) { console.error('Нет данных: сначала npm run visual'); process.exit(1); }
const rows = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));

const order = (p) => Number(String(p).replace(/\D/g, '')) || 9999;
rows.sort((a, b) => a.page.localeCompare(b.page) || order(a.project) - order(b.project));

const lines = ['# Аудит раскладки', '', `Страниц × ширин: ${rows.length}`, ''];
const totals = { overflowDoc: 0, offscreen: 0, clipped: 0, smallTargets: 0 };
for (const r of rows) {
  const n = { overflowDoc: r.overflowDoc ? 1 : 0, offscreen: r.offscreen.length, clipped: r.clipped.length, smallTargets: r.smallTargets.length };
  for (const k of Object.keys(totals)) totals[k] += n[k];
  if (!n.overflowDoc && !n.offscreen && !n.clipped && !n.smallTargets) continue;
  lines.push(`## ${r.page} (${r.project})`);
  if (r.overflowDoc) lines.push(`- Горизонтальная прокрутка: +${r.overflowDoc} px`);
  for (const s of r.offscreen.slice(0, 8)) lines.push(`- За краем: ${s}`);
  if (r.offscreen.length > 8) lines.push(`- …и ещё ${r.offscreen.length - 8} за краем`);
  for (const s of r.clipped.slice(0, 8)) lines.push(`- Обрезано: ${s}`);
  for (const s of r.smallTargets.slice(0, 8)) lines.push(`- Мелкая цель: ${s}`);
  if (r.smallTargets.length > 8) lines.push(`- …и ещё ${r.smallTargets.length - 8} мелких целей`);
  lines.push('');
}
lines.splice(3, 0, `Итого: горизонтальная прокрутка ${totals.overflowDoc}, за краем ${totals.offscreen}, обрезано ${totals.clipped}, мелкие цели ${totals.smallTargets}`, '');

const out = lines.join('\n');
const mdIdx = process.argv.indexOf('--md');
if (mdIdx > -1) { fs.writeFileSync(process.argv[mdIdx + 1], out); console.log(`Записано: ${process.argv[mdIdx + 1]}`); }
else console.log(out);
