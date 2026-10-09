import { GETCOURSE_ACCOUNT, GETCOURSE_API_KEY } from 'astro:env/server';
import { fetchJson } from './http';

export interface GcCustomer { name: string; email: string; phone: string }
export interface GcOffer { code: string; cost: number; title: string }

/**
 * Создаёт заказ в GetCourse из нескольких предложений и возвращает ссылку на оплату.
 * API импорта заказов принимает одно предложение за запрос, поэтому:
 * 1) первый запрос создаёт заказ и возвращает его номер (return_deal_number),
 * 2) следующие добавляют предложения в тот же заказ (deal_number + multiple_offers),
 * 3) последний возвращает ссылку на оплату (return_payment_link).
 * Проверить на тестовом предложении до запуска: формат ответа зависит от настроек аккаунта.
 */
export async function createGcOrder(customer: GcCustomer, offers: GcOffer[], comment: string, utm: Record<string, string> = {}): Promise<{ ok: boolean; link?: string; dealNumber?: string; error?: string }> {
  if (!GETCOURSE_ACCOUNT || !GETCOURSE_API_KEY) return { ok: false, error: 'getcourse_not_configured' };
  if (!offers.length || offers.some((o) => !o.code)) return { ok: false, error: 'offer_code_missing' };
  const url = `https://${GETCOURSE_ACCOUNT}.getcourse.ru/pl/api/deals`;
  let dealNumber: string | undefined;
  let link: string | undefined;
  for (let i = 0; i < offers.length; i++) {
    const last = i === offers.length - 1;
    const params = {
      user: { email: customer.email, phone: customer.phone, first_name: customer.name },
      system: { refresh_if_exists: 1, return_deal_number: 1, ...(last ? { return_payment_link: 1 } : {}), ...(dealNumber ? { multiple_offers: 1 } : {}) },
      session: { utm_source: utm.utm_source, utm_medium: utm.utm_medium, utm_campaign: utm.utm_campaign, utm_content: utm.utm_content, utm_term: utm.utm_term },
      deal: {
        ...(dealNumber ? { deal_number: dealNumber } : {}),
        offer_code: offers[i].code,
        deal_cost: offers[i].cost,
        deal_status: 'new',
        deal_is_paid: 'нет',
        deal_comment: comment,
      },
    };
    const body = new URLSearchParams({ action: 'add', key: GETCOURSE_API_KEY, params: Buffer.from(JSON.stringify(params)).toString('base64') });
    // Повтор только для первого запроса: следующие добавляют предложения в заказ, и повтор мог бы задвоить позицию
    const res = await fetchJson<{ success?: boolean; result?: { success?: boolean; deal_number?: string; payment_link?: string; error_message?: string } }>('getcourse', url, { method: 'POST', body }, { timeoutMs: 10_000, retries: i === 0 ? 1 : 0 });
    const data = res.data;
    if (!res.ok || !data) return { ok: false, error: `getcourse_${res.error ?? 'error'}` };
    if (!data.success || !data.result?.success) return { ok: false, error: data.result?.error_message?.slice(0, 200) ?? 'getcourse_error' };
    dealNumber = data.result.deal_number ?? dealNumber;
    if (last) link = data.result.payment_link;
  }
  return { ok: Boolean(link), link, dealNumber };
}
