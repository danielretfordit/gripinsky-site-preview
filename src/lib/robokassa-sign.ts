// Подписи Robokassa без зависимостей от окружения (тестируются в tests/api.test.ts).
// Документация: https://docs.robokassa.ru/ (раздел «Контрольная сумма»).
import { createHash, timingSafeEqual } from 'node:crypto';

export type HashAlg = 'md5' | 'sha256';

export const rkHash = (alg: HashAlg, s: string) => createHash(alg).update(s, 'utf8').digest('hex');

/** Параметры Shp_ в подписи идут по алфавиту в виде Shp_x=значение через двоеточие */
export const shpString = (shp: Record<string, string>) =>
  Object.keys(shp).sort().map((k) => `${k}=${shp[k]}`).join(':');

/** Подпись ссылки на оплату: MerchantLogin:OutSum:InvId:Receipt:Пароль№1[:Shp_…] */
export function paymentSignature(alg: HashAlg, p: { login: string; outSum: string; invId: number; receipt: string; pass1: string; shp?: Record<string, string> }): string {
  const base = [p.login, p.outSum, String(p.invId), p.receipt, p.pass1].join(':');
  const shp = p.shp ?? {};
  return rkHash(alg, Object.keys(shp).length ? `${base}:${shpString(shp)}` : base);
}

/** Сравнение подписей за постоянное время: по времени ответа нельзя подобрать подпись посимвольно */
export function safeEqualHex(a: string, b: string): boolean {
  const x = Buffer.from(a.toLowerCase(), 'utf8');
  const y = Buffer.from(b.toLowerCase(), 'utf8');
  if (x.length !== y.length || x.length === 0) return false;
  return timingSafeEqual(x, y);
}

export interface ResultCheck { ok: boolean; invId: number | null; outSum: string; isTest: boolean; shp: Record<string, string> }

/** Проверка уведомления на Result URL: OutSum:InvId:Пароль№2[:Shp_…] */
export function verifyResultSignature(alg: HashAlg, pass2: string | undefined, params: URLSearchParams): ResultCheck {
  const outSum = params.get('OutSum') ?? '';
  const invRaw = params.get('InvId') ?? '';
  const invId = /^\d{1,10}$/.test(invRaw) ? Number(invRaw) : null;
  const shp: Record<string, string> = {};
  params.forEach((v, k) => { if (k.startsWith('Shp_')) shp[k] = v; });
  const isTest = params.get('IsTest') === '1';
  if (!pass2 || invId === null || !/^\d+(\.\d{1,2})?$/.test(outSum)) return { ok: false, invId, outSum, isTest, shp };
  const base = [outSum, invRaw, pass2].join(':');
  const expected = rkHash(alg, Object.keys(shp).length ? `${base}:${shpString(shp)}` : base);
  return { ok: safeEqualHex(expected, params.get('SignatureValue') ?? ''), invId, outSum, isTest, shp };
}

/** Суммы сравниваются в копейках: «4900», «4900.0» и «4900.00» одно и то же */
export const toKopecks = (s: string | number) => Math.round(Number(s) * 100);
