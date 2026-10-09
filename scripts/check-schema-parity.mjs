// Совпадение данных и админки: каждое поле, которое есть в файлах контента, должно быть описано в keystatic.config.ts.
// Иначе Keystatic при первом же сохранении записи молча удалит поле (так было с works.isProcessImage у 74 работ).
// Запуск: node scripts/check-schema-parity.mjs   (в CI через npm test)
import fs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';
import cfg from '../keystatic.config.ts';

const problems = [];

/** Ключи данных, которых нет в схеме поля (рекурсивно по объектам и массивам объектов) */
function compare(where, schemaField, value) {
  if (value === null || value === undefined) return;
  if (schemaField.kind === 'object') {
    if (typeof value !== 'object' || Array.isArray(value)) return;
    for (const [k, v] of Object.entries(value)) {
      const f = schemaField.fields[k];
      if (!f) problems.push(`${where}.${k}: поле есть в данных, но не в админке`);
      else compare(`${where}.${k}`, f, v);
    }
  } else if (schemaField.kind === 'array') {
    if (!Array.isArray(value)) return;
    value.forEach((v, i) => compare(`${where}[${i}]`, schemaField.element, v));
  } else if (schemaField.kind === 'conditional') {
    // { discriminant, value }: проверяем ветку по значению
    const branch = schemaField.values?.[String(value?.discriminant)];
    if (branch) compare(`${where}.value`, branch, value?.value);
  }
}

function readEntry(file) {
  const raw = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.json')) return JSON.parse(raw);
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  return m ? parseYaml(m[1]) ?? {} : {};
}

function check(name, entry, isSingleton) {
  const base = entry.path.replace(/\*.*$/, '').replace(/\/$/, '');
  const schema = { kind: 'object', fields: entry.schema };
  // Тело статьи (mdoc) хранится не во frontmatter: поле с contentField пропускаем
  const contentField = typeof entry.format === 'object' ? entry.format.contentField : undefined;
  if (contentField) delete schema.fields[contentField];
  let files = [];
  if (isSingleton) {
    for (const ext of ['.json', '.yaml', '.mdoc']) if (fs.existsSync(base + ext)) files.push(base + ext);
  } else if (fs.existsSync(base)) {
    const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(json|mdoc|yaml)$/.test(e.name)) files.push(p); } };
    walk(base);
  }
  for (const f of files) {
    let data;
    try { data = readEntry(f); } catch (e) { problems.push(`${f}: не читается (${e.message})`); continue; }
    // slugField хранится в имени файла и в поле title: оба допустимы
    compare(`${name}:${path.relative(base, f)}`, schema, data);
  }
  return files.length;
}

let total = 0;
for (const [name, entry] of Object.entries(cfg.collections)) total += check(name, entry, false);
for (const [name, entry] of Object.entries(cfg.singletons ?? {})) total += check(name, entry, true);

// Каждая коллекция видна в меню админки
const inNav = new Set(Object.values(cfg.ui?.navigation ?? {}).flat());
for (const name of [...Object.keys(cfg.collections), ...Object.keys(cfg.singletons ?? {})]) {
  if (!inNav.has(name)) problems.push(`${name}: нет в меню админки (ui.navigation)`);
}

const unique = [...new Set(problems.map((p) => p.replace(/:[^:.\[]+(\.json|\.mdoc|\.yaml)/, ':*').replace(/\[\d+\]/g, '[]')))];
if (unique.length) {
  console.error(`Админка не совпадает с данными (${problems.length} мест, ${unique.length} видов):\n- ${unique.slice(0, 40).join('\n- ')}`);
  process.exit(1);
}
console.log(`Админка совпадает с данными: ${total} записей.`);
