import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quoteSet, quote, basePrice, activeCourseIds, availableAddons, quizResult, selfPriceRule, type Catalog } from '../src/lib/pricing.ts';

// Те же цены, что в src/content (каталог Tilda + решения в docs/decisions.md)
const cat: Catalog = {
  base: {
    id: 'baza', name: 'База 3D-визуализатора', price: 29900,
    parts: ['modeling1', 'modeling2', 'vizualization3'],
    included: [{ id: 'ai', name: 'ИИ в 3D', value: 4900 }],
    gifts: [{ id: 'anim', name: 'Анимация в 3ds Max', value: null }],
  },
  courses: Object.fromEntries([
    ['modeling1', 'Моделирование в 3ds Max. Level 1', 10900] as const,
    ['modeling2', 'Моделирование в 3ds Max. Level 2', 11900] as const,
    ['vizualization3', 'Визуализация в 3ds Max и Corona. Level 3', 27900] as const,
    ['interiorpro', 'Интерьеры PRO', 29900] as const,
    ['exteriorpro', 'Экстерьеры PRO', 32900] as const,
    ['residential_complex', 'Масштабные ЖК', 43900] as const,
    ['3dstock', 'Моделирование под стоки', 19900] as const,
    ['materialspro', 'Материалы Corona PRO', 27900] as const,
    ['ai', 'ИИ в 3D', 4900] as const,
  ].map(([id, name, price]) => [id, { id, name, price, selfPrice: selfPriceRule(price) }])),
  tiers: [{ min: 2, pct: 15 }, { min: 3, pct: 20 }, { min: 4, pct: 22 }],
  tariffs: [
    { id: 'lite', name: 'Самостоятельный', extra: 0 },
    { id: 'opt', name: 'Оптимальный', extra: 15000 },
    { id: 'mentor', name: 'Наставничество', extra: 40000 },
  ],
  professions: {
    int: { title: 'Интерьерный визуализатор', courses: [{ id: 'interiorpro', name: 'Интерьеры PRO', price: 29900, default: true }],
      gift: { id: 'marvelous', name: 'Marvelous Designer', value: 13900 },
      addons: [{ id: 'materialspro', name: 'Материалы Corona PRO', price: 27900 }, { id: 'ai', name: 'ИИ в 3D', price: 4900 }, { id: 'post', name: 'Постобработка', price: null }] },
    ext: { title: 'Экстерьерный визуализатор', courses: [
        { id: 'exteriorpro', name: 'Экстерьеры PRO', price: 32900, default: true },
        { id: 'residential_complex', name: 'Масштабные ЖК', price: 43900, default: false }],
      gift: { id: 'forest-railclone', name: 'Forest Pack + RailClone', value: 22900 },
      addons: [{ id: 'ai', name: 'ИИ в 3D', price: 4900 }] },
    stock: { title: 'Моделлер под стоки', courses: [{ id: '3dstock', name: 'Моделирование под стоки', price: 19900, default: true }],
      gift: { id: 'marvelous', name: 'Marvelous Designer', value: 13900 }, addons: [] },
  },
  installmentMonths: 12,
};

test('пакет по умолчанию: база + интерьеры + Оптимальный = 74 800 ₽, 6 234 ₽/мес', () => {
  const q = quote(cat, { base: true, prof: 'int', addons: [], tariff: 'opt' });
  assert.equal(q.total, 74800);
  assert.equal(q.monthly, 6234);
});

test('цена базы по форматам: 29 900 / 44 900 / 69 900', () => {
  assert.deepEqual(['lite', 'opt', 'mentor'].map((t) => basePrice(cat, t as 'lite')), [29900, 44900, 69900]);
});

test('форматы в пакете: Самостоятельный 49 800, Наставничество 99 800', () => {
  assert.equal(quote(cat, { base: true, prof: 'int', addons: [], tariff: 'lite' }).total, 49800);
  assert.equal(quote(cat, { base: true, prof: 'int', addons: [], tariff: 'mentor' }).total, 99800);
});

test('наставничество доступно без базы с одной доплатой', () => {
  const q = quote(cat, { base: false, prof: 'int', addons: [], tariff: 'mentor' });
  assert.equal(q.total, 69900);
  assert.equal(q.tariffApplied, true);
  assert.equal(q.items.filter((i) => i === 'tariff:mentor').length, 1);
});

test('экстерьеры по умолчанию без ЖК, с ЖК дороже на 43 900', () => {
  assert.equal(quote(cat, { base: true, prof: 'ext', addons: [], tariff: 'opt' }).total, 77800);
  assert.equal(quote(cat, { base: true, prof: 'ext', courses: { residential_complex: true }, addons: [], tariff: 'opt' }).total, 121700);
});

test('последний курс профессии снять нельзя', () => {
  assert.deepEqual(activeCourseIds(cat, { prof: 'ext', courses: { exteriorpro: false } }), ['exteriorpro']);
});

test('ИИ в 3D входит в базу: с базой его нельзя докупить, без базы можно', () => {
  assert.ok(!availableAddons(cat, { prof: 'int', base: true }).some((a) => a.id === 'ai'));
  assert.equal(quote(cat, { base: true, prof: 'int', addons: ['ai'], tariff: 'lite' }).total, 49800);
  assert.equal(quote(cat, { base: false, prof: 'int', addons: ['ai'], tariff: 'lite' }).total, 19380);
});

test('доп. курс без подтверждённой цены не продаётся', () => {
  assert.ok(!availableAddons(cat, { prof: 'int', base: false }).some((a) => a.id === 'post'));
  assert.equal(quote(cat, { base: false, prof: 'int', addons: ['post'], tariff: 'lite' }).total, 19900);
});

test('выгода считается только из реальных цен', () => {
  // 50 700 по отдельности, 44 900 за базу с форматом; ИИ и Marvelous идут бонусом.
  assert.equal(quote(cat, { base: true, prof: 'int', addons: [], tariff: 'opt' }).savings, 24600);
});

test('тест: новичок в экстерьерах получает базу и оба курса профессии', () => {
  const r = quizResult(cat, [0, 0, 'ext', 'opt']);
  assert.equal(r.base, true);
  assert.equal(r.prof, 'ext');
  assert.deepEqual(r.courses, { exteriorpro: true, residential_complex: true });
  assert.equal(quote(cat, { base: r.base, prof: r.prof, courses: r.courses, addons: [], tariff: r.tariff }).total, 121700);
});

test('тест: уверенный и «пока не знаю» пропускает базу и помечен для консультации', () => {
  const r = quizResult(cat, [2, 2, 'unsure', 'lite']);
  assert.equal(r.base, false);
  assert.equal(r.unsure, true);
  assert.equal(r.level, 'Уверенный уровень');
});

import { quoteBaseOnly } from '../src/lib/pricing.ts';
test('только база: цена формата прибавляется, профессии нет', () => {
  const q = quoteBaseOnly(cat, 'opt');
  assert.equal(q.total, 44900);
  assert.equal(q.monthly, 3742);
  assert.ok(!q.items.includes('interiorpro'));
});


test('самостоятельная корзина: 1 / 2 / 3 / 4 курса, скидки и округление', () => {
  const ids = ['modeling1', 'modeling2', 'vizualization3', 'materialspro'];
  [0, 15, 20, 22].forEach((pct, i) => {
    const subset = ids.slice(0, i + 1);
    const q = quoteSet(cat, { ids: subset, support: 'chat' });
    assert.equal(q.pct, pct);
    assert.equal(q.count, i + 1);
    assert.equal(q.total, subset.reduce((sum, id) => sum + Math.round(cat.courses[id].price * (1-pct/100)), 0));
  });
});
test('пустая корзина, повторы и неизвестные позиции не увеличивают итог', () => {
  assert.equal(quoteSet(cat, { ids: [], support: 'chat' }).total, 0);
  const q = quoteSet(cat, { ids: ['modeling1', 'modeling1', '1-2-3lvl', 'unknown', '__proto__', 'constructor'], support: 'chat' });
  assert.equal(q.count, 1);
  assert.equal(q.total, 10900);
});
test('база и её три уровня не оплачиваются дважды', () => {
  const q = quoteSet(cat, { ids: ['baza', 'modeling1', 'modeling2', 'vizualization3', 'ai'], support: 'chat' });
  assert.equal(q.total, 44900);
  assert.equal(q.count, 1);
  assert.equal(q.dropped.length, 4);
  assert.equal(quoteSet(cat, { ids: ['modeling1', 'modeling2', 'vizualization3'], support: 'chat' }).total, 40560);
});
test('подарок профессии не продаётся второй раз', () => {
  const c = { ...cat, courses: { ...cat.courses, marvelous: { id: 'marvelous', name: 'Marvelous', price: 13900, selfPrice: 9900 } } };
  const q = quoteSet(c, { ids: ['baza', 'interiorpro', 'marvelous'], support: 'chat' });
  assert.equal(q.total, 74800);
  assert.deepEqual(q.dropped, ['marvelous']);
  assert.equal(q.lines.filter((l) => l.id === 'marvelous').length, 1);
});
test('подарок базы не продаётся второй раз', () => {
  const c = { ...cat, courses: { ...cat.courses, anim: { id: 'anim', name: 'Анимация', price: 12900, selfPrice: 8900 } } };
  const q = quoteSet(c, { ids: ['baza', 'anim'], support: 'chat' });
  assert.equal(q.total, 44900);
  assert.deepEqual(q.dropped, ['anim']);
});
test('смена поддержки пересчитывает всю корзину', () => {
  const ids = ['modeling1', 'modeling2'];
  const q = quoteSet(cat, { ids, support: 'self' });
  assert.equal(q.total, ids.reduce((sum, id) => sum + Math.round(cat.courses[id].selfPrice * .85), 0));
});

import { normalizeCart } from '../src/stores/cart.ts';
test('сохранённая корзина очищает неизвестные ID и согласует поддержку с тарифом', () => {
  assert.deepEqual(normalizeCart(cat, { ids: ['baza', 'baza', 'constructor', 'unknown', 7], support: 'self', tariff: 'mentor' }), { ids: ['baza'], support: 'self', tariff: 'lite' });
  assert.deepEqual(normalizeCart(cat, null), { ids: [], support: 'chat' });
});

 test('наставник оплачивается один раз для нескольких курсов, пустая корзина бесплатна', () => {
 const ordinary = quoteSet(cat, { ids: ['interiorpro', 'materialspro'], support: 'chat' });
 const mentor = quoteSet(cat, { ids: ['interiorpro', 'materialspro'], support: 'chat', tariff: 'mentor' });
 assert.equal(mentor.total, ordinary.total + 40000);
 assert.equal(mentor.lines.filter(line => line.kind === 'format').length, 1);
 assert.equal(quoteSet(cat, { ids: [], support: 'chat', tariff: 'mentor' }).total, 0);
 });
