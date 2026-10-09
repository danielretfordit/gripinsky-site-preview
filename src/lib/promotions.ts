import { getCollection } from 'astro:content';
import { isLive, untilLabel } from './schedule';

export interface PromoPrice { price: number; label: string; until: string; promo: string; terms?: string | null }

/**
 * Действующие акции: курс → акционная цена. Прежняя цена всегда берётся из каталога (реальная),
 * поэтому зачёркнутая цена не может быть выдуманной. Акция с ценой не ниже каталожной игнорируется.
 * Проверка дат идёт и при сборке, и на сервере при оформлении заказа: после окончания акции сервер
 * считает обычную цену, даже если страница ещё не пересобрана.
 */
export async function activePromoPrices(now = new Date()): Promise<Map<string, PromoPrice>> {
  const courses = new Map((await getCollection('courses')).map((c) => [c.id, c.data]));
  const out = new Map<string, PromoPrice>();
  for (const p of await getCollection('promotions', (e) => isLive(e.data, now))) {
    for (const item of p.data.items) {
      const base = courses.get(item.course.id)?.price ?? 0;
      if (item.price >= base) continue;
      const prev = out.get(item.course.id);
      if (!prev || item.price < prev.price) out.set(item.course.id, { price: item.price, label: p.data.label, until: untilLabel(p.data.end), promo: p.id, terms: p.data.terms });
    }
  }
  return out;
}
