import type { APIRoute } from 'astro';
import { ORDERS_DB } from 'astro:env/server';
import { robokassaTestMode, verifyResult } from '../../../lib/robokassa';
import { orderStore } from '../../../lib/orders';
import { sendLead } from '../../../lib/b24';
import { PayloadTooLarge, readBody } from '../../../lib/security';
import { errorText, log } from '../../../lib/log';

export const prerender = false;

const text = (body: string, status = 200) => new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });

/**
 * Result URL Robokassa (в кабинете: метод POST). Robokassa повторяет уведомление, пока не получит «OK<InvId>»,
 * поэтому повтор отвечает тем же «OK» без второго лида. Сумма сверяется с заказом из хранилища.
 */
async function handle(params: URLSearchParams) {
  const check = verifyResult(params);
  if (!check.ok || check.invId === null) {
    log.warn('robokassa:bad_signature', { invId: check.invId });
    return text('bad sign', 400);
  }
  // Боевой магазин не принимает тестовые платежи
  if (check.isTest && !robokassaTestMode()) {
    log.warn('robokassa:test_payment_in_production', { invId: check.invId });
    return text('test payment rejected', 400);
  }

  let state;
  try { state = orderStore(ORDERS_DB).markPaid(check.invId, check.outSum); }
  catch (e) { log.error('robokassa:store_failed', { invId: check.invId, error: errorText(e) }); return text('retry later', 503); }

  if (state === 'unknown' || state === 'amount_mismatch') {
    log.error(`robokassa:${state}`, { invId: check.invId, outSum: check.outSum });
    return text(state, 400);
  }
  if (state === 'paid') {
    const order = orderStore(ORDERS_DB).get(check.invId);
    await sendLead({
      name: 'Покупатель',
      contact: order?.email ?? params.get('EMail') ?? '',
      context: `Оплачено через Robokassa, счёт ${check.invId}, ${check.outSum} ₽${check.isTest ? ' (тест)' : ''}`,
      packageSummary: order?.summary ?? check.shp.Shp_items ?? '',
    });
    log.info('robokassa:paid', { invId: check.invId, outSum: check.outSum, test: check.isTest });
  } else log.info('robokassa:duplicate', { invId: check.invId });

  return text(`OK${check.invId}`);
}

export const GET: APIRoute = ({ url }) => handle(url.searchParams);
export const POST: APIRoute = async ({ request }) => {
  try { return await handle(new URLSearchParams(await readBody(request, 8 * 1024))); }
  catch (e) { return e instanceof PayloadTooLarge ? text('too large', 413) : text('bad request', 400); }
};
