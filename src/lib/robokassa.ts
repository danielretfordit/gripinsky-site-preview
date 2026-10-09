import { ROBOKASSA_LOGIN, ROBOKASSA_PASS1, ROBOKASSA_PASS2, ROBOKASSA_IS_TEST, ROBOKASSA_HASH } from 'astro:env/server';
import { paymentSignature, verifyResultSignature, type ResultCheck } from './robokassa-sign';

/** Прямая оплата включается, только если заданы логин, оба пароля и явно указан тестовый режим (true или false) */
export const robokassaReady = () => Boolean(ROBOKASSA_LOGIN && ROBOKASSA_PASS1 && ROBOKASSA_PASS2) && ROBOKASSA_IS_TEST !== undefined;
export const robokassaTestMode = () => ROBOKASSA_IS_TEST !== false;
const alg = (): 'md5' | 'sha256' => (ROBOKASSA_HASH === 'md5' ? 'md5' : 'sha256');

export interface RkItem { name: string; sum: number }

/**
 * Ссылка на оплату Robokassa с чеком по 54-ФЗ.
 * Подпись: MerchantLogin:OutSum:InvId:Receipt:Пароль№1[:Shp_…], параметры Shp_ по алфавиту.
 * Receipt в подписи берётся в URL-кодированном виде, а в адресе кодируется ещё раз.
 * Номер счёта (invId) выдаёт хранилище заказов (src/lib/orders.ts): он уникален и по нему сверяется сумма.
 */
export interface ReceiptSettings { sno: string; tax: string; paymentMethod: string; paymentObject: string }
const DEFAULT_RECEIPT: ReceiptSettings = { sno: 'usn_income', tax: 'none', paymentMethod: 'full_payment', paymentObject: 'service' };

export function robokassaUrl(opts: { invId: number; total: number; description: string; email: string; items: RkItem[]; shp?: Record<string, string>; receipt?: ReceiptSettings }): string {
  const r = opts.receipt ?? DEFAULT_RECEIPT;
  const outSum = opts.total.toFixed(2);
  // Чек 54-ФЗ: система налогообложения и НДС из «Интеграций» в админке
  const receipt = encodeURIComponent(JSON.stringify({
    sno: r.sno,
    items: opts.items.map((i) => ({ name: i.name.slice(0, 128), quantity: 1, sum: i.sum, payment_method: r.paymentMethod, payment_object: r.paymentObject, tax: r.tax })),
  }));
  const shp = opts.shp ?? {};
  const signature = paymentSignature(alg(), { login: ROBOKASSA_LOGIN!, outSum, invId: opts.invId, receipt, pass1: ROBOKASSA_PASS1!, shp });
  const q = new URLSearchParams({
    MerchantLogin: ROBOKASSA_LOGIN!,
    OutSum: outSum,
    InvId: String(opts.invId),
    Description: opts.description.slice(0, 100),
    Receipt: receipt,
    SignatureValue: signature,
    Email: opts.email,
    Culture: 'ru',
    ...(robokassaTestMode() ? { IsTest: '1' } : {}),
    ...shp,
  });
  return `https://auth.robokassa.ru/Merchant/Index.aspx?${q.toString()}`;
}

/** Проверка уведомления на Result URL (подпись Паролем №2, сравнение за постоянное время) */
export const verifyResult = (params: URLSearchParams): ResultCheck => verifyResultSignature(alg(), ROBOKASSA_PASS2, params);
