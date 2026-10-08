/** URL and capability switches for the static review build on GitHub Pages. */
export const STATIC_PREVIEW = import.meta.env.PUBLIC_STATIC_PREVIEW === 'true';

export function assetPath(value: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
  return `${base}${value.replace(/^\/+/, '')}`;
}

export function sitePath(value: string): string {
  if (!STATIC_PREVIEW || !value.startsWith('/') || value.startsWith('//')) return value;
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const split = value.search(/[?#]/);
  const pathname = split < 0 ? value : value.slice(0, split);
  const suffix = split < 0 ? '' : value.slice(split);
  if (base && (pathname === base || pathname.startsWith(base + '/'))) return value;
  const file = pathname === '/' ? '/index.html' : /\/[^/]+\.[^/]+$/.test(pathname) ? pathname : pathname + '.html';
  return base + file + suffix;
}
