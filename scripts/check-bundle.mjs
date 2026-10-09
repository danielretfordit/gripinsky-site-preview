// Проверка собранного клиента (dist/client) перед выкладкой:
// 1) в браузер не попали секреты (ключи GetCourse, пароли Robokassa, вебхук Bitrix24, ключи Keystatic);
// 2) React (рантайм админки Keystatic) не попал на публичные страницы: острова сайта на Preact;
// 3) в статике нет страниц админки и черновиков дизайна.
// Запуск после `npm run build`: node scripts/check-bundle.mjs
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('dist/client');
if (!fs.existsSync(ROOT)) { console.error('Нет dist/client: сначала npm run build'); process.exit(1); }

const files = [];
const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : files.push(p); } };
walk(ROOT);

const problems = [];
const rel = (p) => path.relative(ROOT, p);

// Значения секретов из окружения сборки (если заданы) не должны встречаться в клиенте
const SECRET_ENV = ['GETCOURSE_API_KEY', 'ROBOKASSA_PASS1', 'ROBOKASSA_PASS2', 'B24_WEBHOOK_URL', 'KEYSTATIC_GITHUB_CLIENT_SECRET', 'KEYSTATIC_SECRET', 'ADMIN_STATUS_TOKEN'];
const secretValues = SECRET_ENV.map((k) => [k, process.env[k]]).filter(([, v]) => v && v.length >= 8);
// Узнаваемые формы секретов независимо от окружения
const PATTERNS = [
  [/https:\/\/[\w.-]+\.bitrix24\.\w+\/rest\/\d+\/[a-z0-9]{8,}/i, 'вебхук Bitrix24'],
  [/-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/, 'закрытый ключ'],
  [/\bghp_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{40,}/, 'токен GitHub'],
];

const TEXT = /\.(html|js|mjs|css|json|txt|xml|svg|webmanifest)$/;
let reactHits = 0;
for (const f of files) {
  if (!TEXT.test(f)) continue;
  const s = fs.readFileSync(f, 'utf8');
  for (const [k, v] of secretValues) if (s.includes(v)) problems.push(`${rel(f)}: значение ${k}`);
  for (const [re, name] of PATTERNS) if (re.test(s)) problems.push(`${rel(f)}: похоже на ${name}`);
  if (f.endsWith('.js') && /react-dom|__SECRET_INTERNALS|react\.production|Keystatic/.test(s)) { reactHits++; problems.push(`${rel(f)}: React или Keystatic в клиентском бандле`); }
}
for (const p of ['keystatic', 'design', 'styleguide/private']) {
  if (fs.existsSync(path.join(ROOT, p))) problems.push(`${p}/: страницы админки или черновиков в статической сборке`);
}

if (problems.length) {
  console.error(`Проблемы в клиентской сборке (${problems.length}):\n- ${problems.join('\n- ')}`);
  process.exit(1);
}
console.log(`Клиентская сборка чистая: ${files.length} файлов, секретов и React нет${secretValues.length ? `, проверено ${secretValues.length} секретов из окружения` : ''}.`);
