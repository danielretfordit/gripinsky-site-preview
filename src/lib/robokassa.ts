import { createHash } from 'node:crypto';
import { ROBOKASSA_LOGIN, ROBOKASSA_PASS1, ROBOKASSA_PASS2, ROBOKASSA_IS_TEST, ROBOKASSA_HASH } from 'astro:env/server';

export const robokassaReady = () => Boolean(ROBOKASSA_LOGIN && ROBOKASSA_PASS1 && ROBOKASSA_PASS2);

const hash = (s: string) => createHash(ROBOKASSA_HASH === 'md5' ? 'md5' : 'sha256').update(s, 'utf8').digest('hex');
const shpString = (shp: Record<string, string>) =>
  Object.keys(shp).sort().map((k) => `${k}=${shp[k]}`).join(':');

export interface RkItem { name: string; sum: number }

/**
 * Ссылка на оплату Robokassa с чеком по 54-ФЗ.
 * Подпись: MerchantLogin:OutSum:InvId:Receipt:Пароль№1[:Shp_…], параметры Shp_ по алфавиту.
 * Receipt в подписи берётся в URL-кодированном виде, а в адресе кодируется ещё раз.
 * Проверить в тестовом режиме (IsTest=1) до запуска.
 */
export function robokassaUrl(opts: { invId: number; total: number; description: string; email: string; items: RkItem[]; shp?: Record<string, string> }): string {
  const outSum = opts.total.toFixed(2);
  const receipt = encodeURIComponent(JSON.stringify({
    items: opts.items.map((i) => ({ name: i.name.slice(0, 128), quantity: 1, sum: i.sum, payment_method: 'full_payment', payment_object: 'service', tax: 'none' })),
  }));
  const shp = opts.shp ?? {};
  const base = [ROBOKASSA_LOGIN, outSum, String(opts.invId), receipt, ROBOKASSA_PASS1].join(':');
  const signature = hash(Object.keys(shp).length ? `${base}:${shpString(shp)}` : base);
  const q = new URLSearchParams({
    MerchantLogin: ROBOKASSA_LOGIN!,
    OutSum: outSum,
    InvId: String(opts.invId),
    Description: opts.description.slice(0, 100),
    Receipt: receipt,
    SignatureValue: signature,
    Email: opts.email,
    Culture: 'ru',
    ...(ROBOKASSA_IS_TEST ? { IsTest: '1' } : {}),
    ...shp,
  });
  return `https://auth.robokassa.ru/Merchant/Index.aspx?${q.toString()}`;
}

/** Проверка уведомления на Result URL: OutSum:InvId:Пароль№2[:Shp_…] */
export function verifyResult(params: URLSearchParams): { ok: boolean; invId?: string } {
  const outSum = params.get('OutSum') ?? '';
  const invId = params.get('InvId') ?? '';
  const sig = (params.get('SignatureValue') ?? '').toLowerCase();
  const shp: Record<string, string> = {};
  params.forEach((v, k) => { if (k.startsWith('Shp_')) shp[k] = v; });
  const base = [outSum, invId, ROBOKASSA_PASS2].join(':');
  const expected = hash(Object.keys(shp).length ? `${base}:${shpString(shp)}` : base);
  return { ok: Boolean(ROBOKASSA_PASS2) && expected === sig, invId };
}

/** Номер счёта без базы данных: секунды с 2026 года + случайный хвост (до 2^31) */
export const newInvId = () => (Math.floor(Date.now() / 1000) - 1_767_225_600) * 10 + Math.floor(Math.random() * 10);
