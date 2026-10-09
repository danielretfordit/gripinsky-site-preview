// Защита API без зависимостей от Astro: проверка источника запроса, ограничение частоты, лимит тела.
// Используется в src/middleware.ts и покрыта тестами в tests/api.test.ts.

/**
 * Запрос пришёл со страниц самого сайта. Браузер всегда шлёт Origin на POST, а Sec-Fetch-Site подставить из чужой
 * страницы нельзя. Нет обоих заголовков: это не браузер, а скрипт, и форме сайта такой запрос не нужен.
 */
export function isSameOrigin(request: Request, siteOrigins: string[]): boolean {
  const origin = request.headers.get('origin');
  if (origin) return origin !== 'null' && siteOrigins.includes(origin);
  const site = request.headers.get('sec-fetch-site');
  return site === 'same-origin';
}

/** Допустимые источники: адрес сайта и адрес, по которому пришёл запрос (dev, промежуточный стенд) */
export function allowedOrigins(requestUrl: URL, extra: (string | undefined)[] = []): string[] {
  return [...new Set([requestUrl.origin, ...extra.filter((x): x is string => Boolean(x)).map((x) => new URL(x).origin)])];
}

/** IP клиента: за nginx берём X-Real-IP (его ставит только наш прокси), иначе адрес соединения */
export function clientIp(request: Request, connectionIp: string | undefined, trustProxy: boolean): string {
  if (trustProxy) {
    const real = request.headers.get('x-real-ip')?.trim();
    if (real && /^[\d.:a-fA-F]{3,45}$/.test(real)) return real;
  }
  return connectionIp ?? 'unknown';
}

/**
 * Ограничение частоты «ведро с жетонами» в памяти процесса. Второй рубеж после limit_req в nginx:
 * сбрасывается при перезапуске и не делится между процессами, поэтому nginx остаётся главным.
 */
export class RateLimiter {
  private buckets = new Map<string, { tokens: number; at: number }>();
  private lastSweep = 0;
  private capacity: number;
  private refillPerMinute: number;
  private now: () => number;
  constructor(capacity: number, refillPerMinute: number, now: () => number = Date.now) {
    this.capacity = capacity;
    this.refillPerMinute = refillPerMinute;
    this.now = now;
  }

  /** true: запрос разрешён; false: лимит исчерпан */
  take(key: string): boolean {
    const t = this.now();
    this.sweep(t);
    const b = this.buckets.get(key) ?? { tokens: this.capacity, at: t };
    const refill = ((t - b.at) / 60_000) * this.refillPerMinute;
    b.tokens = Math.min(this.capacity, b.tokens + refill);
    b.at = t;
    if (b.tokens < 1) { this.buckets.set(key, b); return false; }
    b.tokens -= 1;
    this.buckets.set(key, b);
    return true;
  }

  /** Сколько секунд ждать следующего жетона (для Retry-After) */
  retryAfter(key: string): number {
    const b = this.buckets.get(key);
    if (!b || b.tokens >= 1) return 0;
    return Math.ceil(((1 - b.tokens) / this.refillPerMinute) * 60);
  }

  private sweep(t: number) {
    if (t - this.lastSweep < 60_000) return;
    this.lastSweep = t;
    for (const [k, b] of this.buckets) if (t - b.at > 10 * 60_000) this.buckets.delete(k);
  }
}

export class PayloadTooLarge extends Error {}

/** Читает тело запроса, но не больше maxBytes (считаются байты потока, Content-Length не обязателен) */
export async function readBody(request: Request, maxBytes: number): Promise<string> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) throw new PayloadTooLarge();
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new PayloadTooLarge(); }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let off = 0;
  for (const c of chunks) { all.set(c, off); off += c.byteLength; }
  return new TextDecoder().decode(all);
}

/** Форма заполнена слишком быстро для человека (бот): поле started ставит скрипт формы при показе */
export function filledTooFast(startedAt: unknown, now = Date.now(), minMs = 2500): boolean {
  const t = Number(startedAt);
  if (!Number.isFinite(t) || t <= 0) return false; // старые вкладки без поля не блокируем
  return now - t < minMs;
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });
}
