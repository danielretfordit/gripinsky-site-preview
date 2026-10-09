// Схемы входящих данных API. Всё, что приходит из браузера, проверяется здесь: типы, длины, допустимые значения.
// Сумму заказа браузер не передаёт: её считает сервер по идентификаторам (src/lib/pricing.ts).
import { z } from 'astro/zod';

const text = (max: number) => z.string().trim().max(max);
/** Метки рекламы: только известные ключи, короткие значения (уходят в Bitrix24 и GetCourse) */
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'yclid', 'gclid'] as const;
/** Из меток берём только известные ключи со строковыми значениями; лишнее отбрасывается, а не ломает заявку */
const utmPart = z.preprocess((v) => {
  if (!v || typeof v !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) { const x = (v as Record<string, unknown>)[k]; if (typeof x === 'string' && x) out[k] = x.slice(0, 200); }
  return Object.keys(out).length ? out : undefined;
}, z.partialRecord(z.enum(UTM_KEYS), z.string()).optional());
export const utmSchema = z
  .object({ first: utmPart, last: utmPart, landing: text(200).optional().catch(undefined) })
  .partial()
  .optional()
  .catch(undefined);
export type Utm = z.infer<typeof utmSchema>;

/** Адрес страницы, с которой пришла заявка: только путь сайта */
const pagePath = text(200).regex(/^\/[\w\-./%а-яё]*$/i).optional().catch(undefined);

// ---------- Заявка на консультацию (/api/lead, FormData) ----------
export const leadSchema = z.object({
  name: text(80).min(2),
  contact: text(80).min(4),
  consent: z.literal('yes'),
  context: text(120).optional().default(''),
  page: pagePath,
  package: text(600).optional().default(''),
  quiz: text(400).optional().default(''),
  utm: z.preprocess((v) => { try { return typeof v === 'string' && v ? JSON.parse(v.slice(0, 2000)) : undefined; } catch { return undefined; } }, utmSchema),
  /** Ловушка для ботов: настоящий посетитель поле не видит и не заполняет */
  website: text(200).optional().default(''),
  /** Время показа формы (мс), ставит скрипт формы */
  started: z.coerce.number().optional().catch(undefined),
});
export type LeadInput = z.infer<typeof leadSchema>;

// ---------- Оформление заказа (/api/checkout, JSON) ----------
const id = text(80).regex(/^[\w-]+$/);
export const checkoutSchema = z.object({
  kind: z.enum(['set', 'course', 'base', 'package']),
  customer: z.object({
    name: text(80).min(2),
    email: z.string().trim().max(120).pipe(z.email()),
    phone: text(30).refine((v) => v.replace(/\D/g, '').length >= 10, 'phone'),
  }),
  consent: z.literal(true),
  selection: z
    .object({
      ids: z.array(id).max(100).optional(),
      support: z.enum(['self', 'chat']).optional(),
      tariff: z.enum(['lite', 'opt', 'mentor']).optional().catch(undefined),
      id: id.optional(),
      base: z.boolean().optional(),
      prof: z.enum(['int', 'ext', 'stock']).optional().catch(undefined),
      courses: z.record(id, z.boolean()).optional(),
      addons: z.array(id).max(10).optional(),
    })
    .default({}),
  page: pagePath,
  utm: utmSchema,
  website: text(200).optional().default(''),
  started: z.coerce.number().optional().catch(undefined),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Первая ошибка проверки в виде кода для клиента (без подробностей реализации) */
export function firstIssue(error: z.ZodError): string {
  const path = error.issues[0]?.path ?? [];
  if (path[0] === 'consent') return 'consent';
  if (path[0] === 'selection') return 'selection';
  return 'validation';
}
