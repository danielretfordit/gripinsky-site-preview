import { B24_WEBHOOK_URL } from 'astro:env/server';
import { fetchJson } from './http';
import { log } from './log';
import { getEntry } from 'astro:content';

export interface Lead {
  name: string;
  contact: string;
  context?: string;
  page?: string;
  packageSummary?: string;
  quiz?: string;
  utm?: Record<string, Record<string, string> | string>;
}

/** Создаёт лид в Bitrix24 через входящий вебхук (crm.lead.add). Без вебхука: режим демо (в журнал без ПД). */
export async function sendLead(lead: Lead): Promise<{ ok: boolean; demo?: boolean; id?: number }> {
  if (!B24_WEBHOOK_URL) {
    log.info('lead:demo', { context: lead.context, page: lead.page, hasPackage: Boolean(lead.packageSummary) });
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
  // Куда и как создавать заявку: «Интеграции» в админке (лид или сделка, воронка, ответственный)
  const cfg = (await getEntry('integrations', 'main'))!.data.bitrix24;
  const fields: Record<string, unknown> = {
    TITLE: cfg.titleTemplate.replace('{context}', lead.context || 'консультация'),
    NAME: lead.name,
    SOURCE_ID: cfg.sourceId || 'WEB',
    COMMENTS: comments,
    UTM_SOURCE: last.utm_source,
    UTM_MEDIUM: last.utm_medium,
    UTM_CAMPAIGN: last.utm_campaign,
    UTM_CONTENT: last.utm_content,
    UTM_TERM: last.utm_term,
  };
  if (isPhone) fields.PHONE = [{ VALUE: lead.contact, VALUE_TYPE: 'WORK' }];
  if (cfg.assignedById) fields.ASSIGNED_BY_ID = cfg.assignedById;
  if (cfg.entity === 'deal') {
    // Сделка без лида: контакт и комментарий в самой сделке
    if (cfg.categoryId != null) fields.CATEGORY_ID = cfg.categoryId;
    if (cfg.stageId) fields.STAGE_ID = cfg.stageId;
    fields.COMMENTS = [`Имя: ${lead.name}`, `Контакт: ${lead.contact}`, comments].filter(Boolean).join('\n');
  } else if (cfg.stageId) fields.STATUS_ID = cfg.stageId;
  const method = cfg.entity === 'deal' ? 'crm.deal.add' : 'crm.lead.add';
  const url = B24_WEBHOOK_URL.replace(/\/?$/, '/') + `${method}.json`;
  const res = await fetchJson<{ result?: number }>('b24', url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fields, params: { REGISTER_SONET_EVENT: 'Y' } }),
  });
  const id = res.data?.result;
  if (!res.ok || !id) { log.error('lead:b24_failed', { status: res.status, error: res.error }); return { ok: false }; }
  log.info('lead:created', { id, context: lead.context });
  return { ok: true, id };
}
