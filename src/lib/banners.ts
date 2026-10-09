import { getCollection, type CollectionEntry } from 'astro:content';
import { isLive } from './schedule';

export type Placement = CollectionEntry<'banners'>['data']['placement'];
export type Banner = CollectionEntry<'banners'>;

/** Подходит ли адрес под список страниц баннера: пусто = все, «/courses-page/*» = раздел */
export function matchesPage(pages: string[], path: string): boolean {
  if (!pages.length) return true;
  const p = path.replace(/\/+$/, '') || '/';
  return pages.some((x) => (x.endsWith('*') ? p.startsWith(x.slice(0, -1)) : p === (x.replace(/\/+$/, '') || '/')));
}

/** Баннеры места на странице: активные на дату сборки, по приоритету (больше = выше) */
export async function bannersFor(placement: Placement, path: string, limit = 1): Promise<Banner[]> {
  const list = await getCollection('banners', (b) => b.data.placement === placement && isLive(b.data) && matchesPage(b.data.pages, path));
  return list.sort((a, b) => b.data.priority - a.data.priority).slice(0, limit);
}

/** Ключ закрытия: меняется вместе с текстом, поэтому новый текст покажется даже тем, кто закрыл старый */
export function dismissKey(b: Banner): string {
  let h = 0;
  for (const ch of b.data.text + (b.data.href ?? '')) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return `gr-banner:${b.id}:${(h >>> 0).toString(36)}`;
}
