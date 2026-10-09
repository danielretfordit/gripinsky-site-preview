import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSameOrigin, allowedOrigins, clientIp, RateLimiter, readBody, PayloadTooLarge, filledTooFast } from '../src/lib/security.ts';
import { leadSchema, checkoutSchema } from '../src/lib/api-schemas.ts';
import { paymentSignature, verifyResultSignature, safeEqualHex, rkHash, toKopecks } from '../src/lib/robokassa-sign.ts';
import { OrderStore } from '../src/lib/orders.ts';
import { maskPii } from '../src/lib/log.ts';

const SITE = 'https://gripinsky.ru';
const req = (headers: Record<string, string>, body?: string) => new Request(`${SITE}/api/lead`, { method: 'POST', headers, body });

// ---------- Источник запроса ----------
test('запрос со своего сайта проходит, с чужого нет', () => {
  const origins = allowedOrigins(new URL(`${SITE}/api/lead`), [SITE]);
  assert.equal(isSameOrigin(req({ origin: SITE }), origins), true);
  assert.equal(isSameOrigin(req({ origin: 'https://evil.example' }), origins), false);
  assert.equal(isSameOrigin(req({ origin: 'null' }), origins), false);
  assert.equal(isSameOrigin(req({ 'sec-fetch-site': 'same-origin' }), origins), true);
  assert.equal(isSameOrigin(req({ 'sec-fetch-site': 'cross-site' }), origins), false);
  assert.equal(isSameOrigin(req({}), origins), false, 'без Origin и Sec-Fetch-Site это не браузер');
});

test('IP клиента берётся из X-Real-IP только за доверенным прокси', () => {
  const r = req({ 'x-real-ip': '203.0.113.7' });
  assert.equal(clientIp(r, '127.0.0.1', true), '203.0.113.7');
  assert.equal(clientIp(r, '127.0.0.1', false), '127.0.0.1');
  assert.equal(clientIp(req({ 'x-real-ip': '1.2.3.4; DROP' }), '127.0.0.1', true), '127.0.0.1');
});

// ---------- Ограничение частоты ----------
test('ограничение частоты: всплеск, отказ, восстановление со временем', () => {
  let now = 0;
  const rl = new RateLimiter(3, 6, () => now); // 3 сразу, дальше 6 в минуту
  assert.deepEqual([rl.take('a'), rl.take('a'), rl.take('a'), rl.take('a')], [true, true, true, false]);
  assert.ok(rl.retryAfter('a') > 0);
  assert.equal(rl.take('b'), true, 'другой IP не страдает');
  now += 10_000; // +1 жетон за 10 с
  assert.equal(rl.take('a'), true);
  assert.equal(rl.take('a'), false);
});

// ---------- Размер тела ----------
test('тело больше лимита отклоняется, даже без Content-Length', async () => {
  assert.equal(await readBody(req({}, 'x'.repeat(100)), 1024), 'x'.repeat(100));
  await assert.rejects(readBody(req({}, 'x'.repeat(2000)), 1024), PayloadTooLarge);
  await assert.rejects(readBody(req({ 'content-length': '999999' }, 'x'), 1024), PayloadTooLarge);
});

test('форма, отправленная быстрее 2,5 с после показа, считается ботом', () => {
  assert.equal(filledTooFast(1000, 2000), true);
  assert.equal(filledTooFast(1000, 10_000), false);
  assert.equal(filledTooFast(undefined, 10_000), false, 'старые вкладки без поля не блокируются');
});

// ---------- Схемы ----------
test('заявка: обязательные поля, согласие, метки только известные', () => {
  const ok = leadSchema.safeParse({ name: 'Анна', contact: '+7 999 123-45-67', consent: 'yes', page: '/courses', utm: JSON.stringify({ last: { utm_source: 'ya', evil: '<script>' } }) });
  assert.ok(ok.success);
  assert.deepEqual(ok.data.utm, { last: { utm_source: 'ya' } });
  assert.equal(leadSchema.safeParse({ name: 'Анна', contact: '+79991234567', consent: 'no' }).success, false);
  assert.equal(leadSchema.safeParse({ name: 'А', contact: '+79991234567', consent: 'yes' }).success, false);
  assert.equal(leadSchema.parse({ name: 'Анна', contact: '+79991234567', consent: 'yes', page: 'javascript:alert(1)' }).page, undefined);
  assert.equal(leadSchema.parse({ name: 'Анна', contact: '+79991234567', consent: 'yes', utm: '{битый json' }).utm, undefined);
});

test('оформление: сумма из браузера не принимается, лишние поля отбрасываются', () => {
  const r = checkoutSchema.parse({ kind: 'set', customer: { name: 'Анна', email: 'a@b.ru', phone: '+7 (999) 123-45-67' }, consent: true, selection: { ids: ['modeling1'], support: 'chat' }, total: 1 });
  assert.equal('total' in r, false);
  assert.equal(checkoutSchema.safeParse({ kind: 'set', customer: { name: 'Анна', email: 'a@b.ru', phone: '123' }, consent: true }).success, false);
  assert.equal(checkoutSchema.safeParse({ kind: 'set', customer: { name: 'Анна', email: 'a@b.ru', phone: '+79991234567' }, consent: true, selection: { ids: ['../etc'] } }).success, false);
  assert.equal(checkoutSchema.safeParse({ kind: 'hack', customer: { name: 'Анна', email: 'a@b.ru', phone: '+79991234567' }, consent: true }).success, false);
});

// ---------- Robokassa ----------
const PASS2 = 'secret-pass-2';
const resultParams = (outSum: string, invId: string, pass = PASS2, extra: Record<string, string> = {}) => {
  const sig = rkHash('sha256', [outSum, invId, pass].join(':') + (Object.keys(extra).length ? ':' + Object.keys(extra).sort().map((k) => `${k}=${extra[k]}`).join(':') : ''));
  return new URLSearchParams({ OutSum: outSum, InvId: invId, SignatureValue: sig.toUpperCase(), ...extra });
};

test('подпись уведомления: верная проходит (регистр не важен), подделка нет', () => {
  assert.equal(verifyResultSignature('sha256', PASS2, resultParams('4900.00', '100001')).ok, true);
  assert.equal(verifyResultSignature('sha256', PASS2, resultParams('4900.00', '100001', 'wrong')).ok, false);
  assert.equal(verifyResultSignature('sha256', PASS2, resultParams('4900.00', '100001', PASS2, { Shp_items: 'ai' })).ok, true);
  const tampered = resultParams('4900.00', '100001'); tampered.set('OutSum', '1.00');
  assert.equal(verifyResultSignature('sha256', PASS2, tampered).ok, false);
  assert.equal(verifyResultSignature('sha256', undefined, resultParams('4900.00', '100001', '')).ok, false, 'без Пароля №2 ничего не принимаем');
  assert.equal(verifyResultSignature('sha256', PASS2, resultParams('4900.00', '1 OR 1=1')).ok, false);
});

test('сравнение подписей и подпись ссылки', () => {
  assert.equal(safeEqualHex('ABC1', 'abc1'), true);
  assert.equal(safeEqualHex('abc1', 'abc2'), false);
  assert.equal(safeEqualHex('', ''), false);
  const a = paymentSignature('sha256', { login: 'shop', outSum: '100.00', invId: 5, receipt: 'r', pass1: 'p1' });
  assert.equal(a, rkHash('sha256', 'shop:100.00:5:r:p1'));
  assert.equal(toKopecks('4900'), toKopecks('4900.00'));
});

// ---------- Хранилище заказов ----------
test('заказы: уникальный номер, сверка суммы, повтор уведомления', () => {
  const store = new OrderStore(':memory:');
  const a = store.create(4900, 'ИИ в 3D', 'a@b.ru');
  const b = store.create(29900, 'База', 'c@d.ru');
  assert.ok(a > 100000 && b === a + 1, 'номера растут и не начинаются с 1');
  assert.equal(store.markPaid(a, '1.00'), 'amount_mismatch');
  assert.equal(store.markPaid(a, '4900.00'), 'paid');
  assert.equal(store.markPaid(a, '4900.00'), 'duplicate');
  assert.equal(store.markPaid(999_999, '4900.00'), 'unknown');
  assert.equal(store.get(a)?.status, 'paid');
  store.close();
});

// ---------- Журнал ----------
test('в журнале нет телефона и почты', () => {
  const s = maskPii('Анна, +7 (999) 123-45-67, anna.petrova@mail.ru');
  assert.ok(!s.includes('123-45') && !s.includes('anna.petrova'));
  assert.match(s, /\*\*\*67/);
});
