import { getCollection } from 'astro:content';
import { canonicalPath } from './seo';

/** Page-level SEO entries override layout defaults only for the exact route. */
export async function getPageSeo(pathname: string) {
  const entries = await getCollection('pageSeo');
  const byRoute = new Map<string, (typeof entries)[number]['data']>();
  for (const entry of entries) {
    const route = canonicalPath(entry.data.route);
    if (byRoute.has(route)) throw new Error('Повторяется SEO-маршрут ' + route);
    byRoute.set(route, entry.data);
  }
  return byRoute.get(canonicalPath(pathname));
}
