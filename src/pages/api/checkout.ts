import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { CHECKOUT_MODE } from 'astro:env/server';
import { getCatalog } from '../../lib/catalog';
import { quoteSet, quote, quoteBaseOnly, quoteCourse, summarize, type Quote, type Selection, type TariffId, type ProfId } from '../../lib/pricing';
import { sendLead } from '../../lib/b24';
import { createGcOrder } from '../../lib/getcourse';
import { robokassaReady, robokassaUrl, newInvId } from '../../lib/robokassa';

export const prerender = false;

const TARIFFS: TariffId[] = ['lite', 'opt', 'mentor'];
const PROFS: ProfId[] = ['int', 'ext', 'stock'];

export const POST: APIRoute = async ({ request, url }) => {
  let body: any;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }

  // Сумму из браузера не принимаем: только идентификаторы, итог считаем здесь
  const c = body?.customer ?? {};
  const customer = { name: String(c.name ?? '').trim().slice(0, 80), email: String(c.email ?? '').trim().slice(0, 120), phone: String(c.phone ?? '').trim().slice(0, 30) };
  if (customer.name.length < 2 || !/^\S+@\S+\.\S+$/.test(customer.email) || customer.phone.replace(/\D/g, '').length < 10) return json({ ok: false, error: 'validation' }, 422);
  if (body?.consent !== true) return json({ ok: false, error: 'consent' }, 422);

  const cat = await getCatalog();
  const s = body.selection ?? {};
  const tariff: TariffId = TARIFFS.includes(s.tariff) ? s.tariff : 'opt';
  let q: Quote;
  if (body.kind === 'set') {
    if (!Array.isArray(s.ids) || !s.ids.length || s.ids.length > 100 || s.ids.some((id: unknown) => typeof id !== 'string' || (id !== cat.base.id && !Object.hasOwn(cat.courses, id))) || !['self', 'chat'].includes(s.support) || (s.tariff != null && !TARIFFS.includes(s.tariff))) return json({ ok: false, error: 'selection' }, 422);
    const setTariff = s.support === 'self' ? 'lite' : s.tariff === 'mentor' ? 'mentor' : 'opt';
    q = quoteSet(cat, { ids: s.ids, support: s.support, tariff: setTariff });
    if (!Number.isFinite(q.total) || q.total <= 0) return json({ ok: false, error: 'empty_cart' }, 422);
  } else if (body.kind === 'course') {
    const entry = (await getCollection('courses')).find((x) => x.id === String(s.id ?? ''));
    if (!entry || entry.data.status !== 'active' || entry.data.price <= 0 || entry.data.type === 'package') return json({ ok: false, error: 'course' }, 422);
    q = quoteCourse({ id: entry.id, name: entry.data.title, price: entry.data.price }, cat.installmentMonths);
  } else if (body.kind === 'base' || body.kind === 'package') q = body.kind === 'base'
    ? quoteBaseOnly(cat, tariff)
    : quote(cat, {
        base: s.base !== false,
        prof: PROFS.includes(s.prof) ? s.prof : 'int',
        courses: typeof s.courses === 'object' && s.courses ? Object.fromEntries(Object.entries(s.courses).map(([k, v]) => [String(k), Boolean(v)])) : {},
        addons: Array.isArray(s.addons) ? s.addons.map(String).slice(0, 10) : [],
        tariff,
      } satisfies Selection);
  else return json({ ok: false, error: 'kind' }, 422);
  const summary = summarize(q);
  const utmLast = (body.utm?.last ?? {}) as Record<string, string>;

  if (CHECKOUT_MODE === 'getcourse') {
    const courses = new Map((await getCollection('courses')).map((x) => [x.id, x.data]));
    const tariffs = new Map((await getCollection('tariffs')).map((x) => [x.id, x.data]));
    const offers = q.lines
      .filter((l) => l.kind !== 'included')
      .map((l) => {
        const code = l.id.startsWith('tariff:') ? tariffs.get(l.id.slice(7))?.getcourse.offerCode : courses.get(l.id)?.getcourse.offerCode ?? '';
        return { code: code ?? '', cost: l.price, title: l.name };
      })
      .filter((o) => !(o.cost === 0 && !o.code));
    const r = await createGcOrder(customer, offers, `Сайт: ${summary}`, utmLast);
    if (r.ok && r.link) return json({ ok: true, mode: 'getcourse', total: q.total, redirect: r.link });
    console.error('[checkout:getcourse]', r.error);
    // Не теряем покупателя: заявка уходит в CRM
  }

  if (CHECKOUT_MODE === 'robokassa' && robokassaReady()) {
    const items = q.lines.filter((l) => l.price > 0).map((l) => ({ name: l.name, sum: l.price }));
    const redirect = robokassaUrl({ invId: newInvId(), total: q.total, description: 'Обучение в Академии 3D GRIPINSKY', email: customer.email, items, shp: { Shp_items: q.items.join(',').slice(0, 200) } });
    await sendLead({ name: customer.name, contact: customer.phone, context: 'Переход к оплате Robokassa', page: String(body.page ?? ''), packageSummary: `${summary}; ${customer.email}`, utm: body.utm });
    return json({ ok: true, mode: 'robokassa', total: q.total, redirect });
  }

  const lead = await sendLead({ name: customer.name, contact: customer.phone, context: 'Оформление пакета', page: String(body.page ?? url.pathname), packageSummary: `${summary}; ${customer.email}`, utm: body.utm });
  return json({ ok: lead.ok, mode: 'demo', total: q.total }, lead.ok ? 200 : 502);
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
