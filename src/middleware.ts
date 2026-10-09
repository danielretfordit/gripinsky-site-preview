// Защита серверных маршрутов /api/*. Статические страницы собираются заранее и сюда не попадают
// (их заголовки безопасности отдаёт nginx: deploy/nginx/security-headers.conf).
import { defineMiddleware } from 'astro:middleware';
import { TRUST_PROXY } from 'astro:env/server';
import { RateLimiter, allowedOrigins, clientIp, isSameOrigin, json } from './lib/security';
import { log } from './lib/log';

/** Максимальный размер тела запроса к API сайта (заявка и оформление весят меньше 4 КБ) */
export const API_MAX_BODY = 16 * 1024;

// Заявки и оформление: всплеск до 6 запросов, дальше 10 в минуту с одного IP
const limiter = new RateLimiter(6, 10);

const ROUTES: Record<string, { methods: string[]; types?: RegExp; public?: boolean }> = {
  '/api/lead': { methods: ['POST'], types: /^(multipart\/form-data|application\/x-www-form-urlencoded)\b/ },
  '/api/checkout': { methods: ['POST'], types: /^application\/json\b/ },
  // Уведомление Robokassa приходит с её серверов: источник проверяет подпись (и список IP в nginx)
  '/api/robokassa/result': { methods: ['GET', 'POST'], public: true },
  '/api/health': { methods: ['GET'], public: true },
  '/api/admin/status': { methods: ['GET'], public: true },
};

const SECURITY_HEADERS: Record<string, string> = {
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
  'x-robots-tag': 'noindex',
  'referrer-policy': 'no-referrer',
};

export const onRequest = defineMiddleware(async (ctx, next) => {
  const { pathname } = ctx.url;
  if (ctx.isPrerendered || !pathname.startsWith('/api/') || pathname.startsWith('/api/keystatic')) return next();

  const route = ROUTES[pathname.replace(/\/+$/, '')];
  if (!route) return json({ ok: false, error: 'not_found' }, 404, SECURITY_HEADERS);
  if (!route.methods.includes(ctx.request.method)) return json({ ok: false, error: 'method' }, 405, { ...SECURITY_HEADERS, allow: route.methods.join(', ') });

  if (!route.public) {
    const site = import.meta.env.SITE;
    if (!isSameOrigin(ctx.request, allowedOrigins(ctx.url, [site]))) {
      log.warn('api:origin_blocked', { path: pathname, origin: ctx.request.headers.get('origin') ?? '' });
      return json({ ok: false, error: 'origin' }, 403, SECURITY_HEADERS);
    }
    if (route.types && !route.types.test(ctx.request.headers.get('content-type') ?? '')) return json({ ok: false, error: 'content_type' }, 415, SECURITY_HEADERS);
    if (Number(ctx.request.headers.get('content-length') ?? 0) > API_MAX_BODY) return json({ ok: false, error: 'too_large' }, 413, SECURITY_HEADERS);
    const ip = clientIp(ctx.request, safeAddress(ctx), TRUST_PROXY);
    if (!limiter.take(`${pathname}:${ip}`)) {
      log.warn('api:rate_limited', { path: pathname });
      return json({ ok: false, error: 'rate_limit' }, 429, { ...SECURITY_HEADERS, 'retry-after': String(limiter.retryAfter(`${pathname}:${ip}`) || 60) });
    }
  }

  const res = await next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!res.headers.has(k)) res.headers.set(k, v);
  return res;
});

function safeAddress(ctx: { clientAddress: string }): string | undefined {
  try { return ctx.clientAddress; } catch { return undefined; }
}
