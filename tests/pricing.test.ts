import { test } from 'node:test';
import assert from 'node:assert/strict';
import { quote, basePrice, activeCourseIds, availableAddons, quizResult, type Catalog } from '../src/lib/pricing.ts';

// Те же цены, что в src/content (каталог Tilda + решения в docs/decisions.md)
const cat: Catalog = {
  base: {
    id: 'baza', name: 'База 3D-визуализатора', price: 29900, separately: 10900 + 11900 + 27900,
    included: [{ id: 'ai', name: 'ИИ в 3D', value: 4900 }],
    gifts: [{ id: 'anim', name: 'Анимация в 3ds Max', value: null }],
  },
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

test('форматы в пакете: Самостоятельный 59 800, Наставничество 99 800', () => {
  assert.equal(quote(cat, { base: true, prof: 'int', addons: [], tariff: 'lite' }).total, 59800);
  assert.equal(quote(cat, { base: true, prof: 'int', addons: [], tariff: 'mentor' }).total, 99800);
});

test('без базы доплата за формат не берётся', () => {
  const q = quote(cat, { base: false, prof: 'int', addons: [], tariff: 'mentor' });
  assert.equal(q.total, 29900);
  assert.equal(q.tariffApplied, false);
  assert.ok(!q.items.some((i) => i.startsWith('tariff:')));
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
  assert.equal(quote(cat, { base: true, prof: 'int', addons: ['ai'], tariff: 'lite' }).total, 59800);
  assert.equal(quote(cat, { base: false, prof: 'int', addons: ['ai'], tariff: 'lite' }).total, 34800);
});

test('доп. курс без подтверждённой цены не продаётся', () => {
  assert.ok(!availableAddons(cat, { prof: 'int', base: false }).some((a) => a.id === 'post'));
  assert.equal(quote(cat, { base: false, prof: 'int', addons: ['post'], tariff: 'lite' }).total, 29900);
});

test('выгода считается только из реальных цен', () => {
  // 50 700 − 29 900 = 20 800 за базу, + ИИ 4 900, + Marvelous 13 900; у анимации цены нет
  assert.equal(quote(cat, { base: true, prof: 'int', addons: [], tariff: 'opt' }).savings, 39600);
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
