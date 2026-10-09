// Журнал сервера в одну строку JSON. Персональные данные (телефон, почта, имя) маскируются всегда,
// в том числе в демо-режиме: журнал читают на сервере, а по 152-ФЗ лишние копии ПД не нужны.

const EMAIL = /([\w.+-])[\w.+-]*@([\w-])[\w.-]*\.(\w+)/g;
const PHONE = /(\+?\d[\d\s()-]{7,}\d)/g;

export const maskEmail = (s: string) => s.replace(EMAIL, '$1***@$2***.$3');
export const maskPhone = (s: string) => s.replace(PHONE, (m) => { const d = m.replace(/\D/g, ''); return `***${d.slice(-2)}`; });
export const maskPii = (s: string) => maskPhone(maskEmail(s));

const PII_KEYS = new Set(['name', 'contact', 'email', 'phone', 'first_name', 'NAME', 'PHONE', 'EMAIL']);

function redact(v: unknown, depth = 0): unknown {
  if (depth > 4) return '[…]';
  if (typeof v === 'string') return maskPii(v).slice(0, 500);
  if (Array.isArray(v)) return v.slice(0, 20).map((x) => redact(x, depth + 1));
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [k, PII_KEYS.has(k) ? '***' : redact(x, depth + 1)]));
  }
  return v;
}

type Level = 'info' | 'warn' | 'error';
function write(level: Level, event: string, data?: Record<string, unknown>) {
  const line = JSON.stringify({ t: new Date().toISOString(), level, event, ...(data ? (redact(data) as Record<string, unknown>) : {}) });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.info)(line);
}

export const log = {
  info: (event: string, data?: Record<string, unknown>) => write('info', event, data),
  warn: (event: string, data?: Record<string, unknown>) => write('warn', event, data),
  error: (event: string, data?: Record<string, unknown>) => write('error', event, data),
};

/** Текст ошибки без подробностей, которые могут содержать адреса и ключи */
export const errorText = (e: unknown) => (e instanceof Error ? `${e.name}: ${maskPii(e.message).replace(/https?:\/\/\S+/g, '[url]')}` : 'unknown');
