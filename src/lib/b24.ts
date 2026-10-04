import { B24_WEBHOOK_URL } from 'astro:env/server';

export interface Lead {
  name: string;
  contact: string;
  context?: string;
  page?: string;
  packageSummary?: string;
  quiz?: string;
  utm?: Record<string, Record<string, string> | string>;
}

/** Создаёт лид в Bitrix24 через входящий вебхук (crm.lead.add). Без вебхука: режим демо. */
export async function sendLead(lead: Lead): Promise<{ ok: boolean; demo?: boolean; id?: number }> {
  if (!B24_WEBHOOK_URL) {
    console.info('[lead:demo]', JSON.stringify(lead));
    return { ok: true, demo: true };
  }
  const isPhone = /\d{6,}/.test(lead.contact.replace(/\D/g, ''));
  const last = (lead.utm?.last ?? {}) as Record<string, string>;
  const comments = [
    lead.context && `Откуда: ${lead.context}`,
    lead.page && `Страница: ${lead.page}`,
    lead.packageSummary && `Пакет: ${lead.packageSummary}`,
    lead.quiz && `Тест: ${lead.quiz}`,
    !isPhone && `Контакт: ${lead.contact}`,
  ].filter(Boolean).join('\n');
  const fields: Record<string, unknown> = {
    TITLE: `Заявка с сайта: ${lead.context || 'консультация'}`,
    NAME: lead.name,
    SOURCE_ID: 'WEB',
    COMMENTS: comments,
    UTM_SOURCE: last.utm_source,
    UTM_MEDIUM: last.utm_medium,
    UTM_CAMPAIGN: last.utm_campaign,
    UTM_CONTENT: last.utm_content,
    UTM_TERM: last.utm_term,
  };
  if (isPhone) fields.PHONE = [{ VALUE: lead.contact, VALUE_TYPE: 'WORK' }];
  const url = B24_WEBHOOK_URL.replace(/\/?$/, '/') + 'crm.lead.add.json';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields, params: { REGISTER_SONET_EVENT: 'Y' } }),
  });
  if (!res.ok) return { ok: false };
  const data = (await res.json()) as { result?: number };
  return { ok: Boolean(data.result), id: data.result };
}
