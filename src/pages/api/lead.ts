import type { APIRoute } from 'astro';
import { sendLead } from '../../lib/b24';
import { leadSchema, firstIssue } from '../../lib/api-schemas';
import { PayloadTooLarge, filledTooFast, json, readBody } from '../../lib/security';
import { log } from '../../lib/log';
import { API_MAX_BODY } from '../../middleware';

export const prerender = false;

// Заявка на консультацию. Источник, тип, размер и частоту уже проверил src/middleware.ts
export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try {
    const raw = await readBody(request, API_MAX_BODY);
    form = await new Response(raw, { headers: { 'content-type': request.headers.get('content-type') ?? '' } }).formData();
  } catch (e) {
    return e instanceof PayloadTooLarge ? json({ ok: false, error: 'too_large' }, 413) : json({ ok: false, error: 'bad_request' }, 400);
  }

  const parsed = leadSchema.safeParse(Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : ''])));
  if (!parsed.success) return json({ ok: false, error: firstIssue(parsed.error) }, 422);
  const d = parsed.data;

  // Ловушки для ботов: скрытое поле заполнено или форма отправлена быстрее, чем человек успел бы её прочитать.
  // Боту отвечаем «успехом», чтобы он не подбирал обход.
  if (d.website || filledTooFast(d.started)) {
    log.warn('lead:bot', { honeypot: Boolean(d.website) });
    return json({ ok: true });
  }

  const result = await sendLead({ name: d.name, contact: d.contact, utm: d.utm as never, context: d.context, page: d.page, packageSummary: d.package, quiz: d.quiz });
  // Номер лида в CRM наружу не отдаётся
  return json({ ok: result.ok, ...(result.demo ? { demo: true } : {}) }, result.ok ? 200 : 502);
};
