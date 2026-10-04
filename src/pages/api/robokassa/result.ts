import type { APIRoute } from 'astro';
import { verifyResult } from '../../../lib/robokassa';
import { sendLead } from '../../../lib/b24';

export const prerender = false;

// Result URL Robokassa. В кабинете Robokassa выбрать метод GET (POST с чужого домена Astro может отклонить).
async function handle(params: URLSearchParams) {
  const { ok, invId } = verifyResult(params);
  if (!ok) return new Response('bad sign', { status: 400 });
  await sendLead({
    name: params.get('EMail') ?? 'Покупатель',
    contact: params.get('EMail') ?? '',
    context: `Оплачено через Robokassa, счёт ${invId}, ${params.get('OutSum')} ₽`,
    packageSummary: params.get('Shp_items') ?? '',
  });
  return new Response(`OK${invId}`, { headers: { 'content-type': 'text/plain' } });
}

export const GET: APIRoute = ({ url }) => handle(url.searchParams);
export const POST: APIRoute = async ({ request }) => handle(new URLSearchParams(await request.text()));
