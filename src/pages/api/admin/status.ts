import type { APIRoute } from 'astro';
import { getEntry } from 'astro:content';
import {
  ADMIN_STATUS_TOKEN, CHECKOUT_MODE, GETCOURSE_ACCOUNT, GETCOURSE_API_KEY, B24_WEBHOOK_URL,
  ROBOKASSA_LOGIN, ROBOKASSA_PASS1, ROBOKASSA_PASS2, ROBOKASSA_IS_TEST, ORDERS_DB,
} from 'astro:env/server';
import { timingSafeEqual } from 'node:crypto';
import { json } from '../../../lib/security';
import { orderStore } from '../../../lib/orders';
import { fetchJson } from '../../../lib/http';

export const prerender = false;

const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

/**
 * Состояние интеграций для админа: что настроено (да или нет), режим оформления, тестовый режим, база заказов.
 * Значения ключей и паролей не возвращаются никогда. Доступ: заголовок X-Admin-Token: <ADMIN_STATUS_TOKEN>
 * (плюс пароль nginx на /api/admin: он занимает заголовок Authorization). ?check=1 дополнительно делает безопасный пробный запрос в Bitrix24.
 */
export const GET: APIRoute = async ({ request, url }) => {
  const auth = request.headers.get('x-admin-token') ?? '';
  if (!ADMIN_STATUS_TOKEN || !same(auth, ADMIN_STATUS_TOKEN)) return json({ ok: false, error: 'unauthorized' }, 401);

  const settings = (await getEntry('integrations', 'main'))!.data;
  let ordersOk = false;
  try { ordersOk = orderStore(ORDERS_DB).healthy(); } catch { ordersOk = false; }

  let b24Check: string | undefined;
  if (url.searchParams.get('check') === '1' && B24_WEBHOOK_URL) {
    // Только чтение: список полей сущности, ничего не создаётся
    const method = settings.bitrix24.entity === 'deal' ? 'crm.deal.fields' : 'crm.lead.fields';
    const r = await fetchJson('b24', B24_WEBHOOK_URL.replace(/\/?$/, '/') + `${method}.json`, { method: 'GET' }, { retries: 0, timeoutMs: 5000 });
    b24Check = r.ok ? 'ok' : r.error ?? 'error';
  }

  return json({
    ok: true,
    checkoutMode: CHECKOUT_MODE,
    getcourse: { configured: Boolean((GETCOURSE_ACCOUNT || settings.getcourse.account) && GETCOURSE_API_KEY), account: Boolean(GETCOURSE_ACCOUNT || settings.getcourse.account), apiKey: Boolean(GETCOURSE_API_KEY) },
    bitrix24: { configured: Boolean(B24_WEBHOOK_URL), entity: settings.bitrix24.entity, ...(b24Check ? { check: b24Check } : {}) },
    robokassa: {
      configured: Boolean(ROBOKASSA_LOGIN && ROBOKASSA_PASS1 && ROBOKASSA_PASS2),
      testMode: ROBOKASSA_IS_TEST === undefined ? 'не задан (прямая оплата выключена)' : ROBOKASSA_IS_TEST,
      receipt: { sno: settings.robokassa.sno, tax: settings.robokassa.tax },
    },
    orders: { db: ordersOk },
    version: import.meta.env.PUBLIC_BUILD_SHA ?? 'local',
  });
};
