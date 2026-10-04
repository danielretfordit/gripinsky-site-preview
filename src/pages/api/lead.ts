import type { APIRoute } from 'astro';
import { sendLead } from '../../lib/b24';

export const prerender = false;

const clip = (v: FormDataEntryValue | null, n = 500) => String(v ?? '').trim().slice(0, n);

export const POST: APIRoute = async ({ request }) => {
  let form: FormData;
  try { form = await request.formData(); } catch { return json({ ok: false, error: 'bad_request' }, 400); }

  // Ловушка для ботов: настоящий посетитель это поле не видит
  if (clip(form.get('website'))) return json({ ok: true });

  const name = clip(form.get('name'), 80);
  const contact = clip(form.get('contact'), 80);
  if (name.length < 2 || contact.length < 4) return json({ ok: false, error: 'validation' }, 422);
  if (form.get('consent') !== 'yes') return json({ ok: false, error: 'consent' }, 422);

  let utm = {};
  try { utm = JSON.parse(clip(form.get('utm'), 2000) || '{}'); } catch {}

  const result = await sendLead({
    name, contact, utm,
    context: clip(form.get('context'), 120),
    page: clip(form.get('page'), 200),
    packageSummary: clip(form.get('package'), 600),
    quiz: clip(form.get('quiz'), 400),
  });
  return json(result, result.ok ? 200 : 502);
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}
