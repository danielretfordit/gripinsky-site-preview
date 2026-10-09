// Запросы к внешним сервисам (Bitrix24, GetCourse): тайм-аут, один повтор при сбое сети или 5xx, без выброса исключений.
import { errorText, log } from './log.ts';

export interface FetchResult<T> { ok: boolean; status: number; data?: T; error?: string }

export async function fetchJson<T>(service: string, url: string, init: RequestInit, opts: { timeoutMs?: number; retries?: number } = {}): Promise<FetchResult<T>> {
  const { timeoutMs = 8000, retries = 1 } = opts;
  let last: FetchResult<T> = { ok: false, status: 0, error: 'not_started' };
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
      const data = (await res.json().catch(() => undefined)) as T | undefined;
      last = { ok: res.ok, status: res.status, data, error: res.ok ? undefined : `http_${res.status}` };
      if (res.ok || res.status < 500) return last;
    } catch (e) {
      last = { ok: false, status: 0, error: e instanceof Error && e.name === 'TimeoutError' ? 'timeout' : 'network' };
      log.warn(`${service}:fetch_failed`, { attempt, error: errorText(e) });
    }
    if (attempt < retries) await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
  }
  log.error(`${service}:unavailable`, { status: last.status, error: last.error });
  return last;
}
