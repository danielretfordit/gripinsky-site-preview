export const SITE = 'https://gripinsky.ru';

/** Путь без `.html`, `/index` и слэша на конце (адреса как на Tilda) */
export function canonicalPath(pathname: string): string {
  let p = pathname.replace(/\.html$/, '').replace(/\/index$/, '/');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

export function canonicalUrl(pathname: string): string {
  const p = canonicalPath(pathname);
  return p === '/' ? SITE + '/' : SITE + p;
}

export function absUrl(path: string): string {
  return path.startsWith('http') ? path : SITE + path;
}

export interface Crumb { name: string; href?: string }

export function breadcrumbLd(crumbs: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: absUrl(c.href) } : {}),
    })),
  };
}

export const organizationLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Академия 3D GRIPINSKY',
  url: SITE + '/',
  logo: SITE + '/logo.png',
  sameAs: [
    'https://www.youtube.com/@gripinsky',
    'https://vk.com/gripinsky',
    'https://t.me/gripinsky',
    'https://yandex.ru/maps/org/akademiya_3d_yevgeniya_gripinskogo/94110272516/',
  ],
};
