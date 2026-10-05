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

/** Описание для meta description: целые предложения, не длиннее max знаков (старые описания Tilda обрезаны на 255) */
export function clipText(text: string, max = 160): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max + 1);
  const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (end > max * 0.5) return cut.slice(0, end + 1);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

/** Картинки превью для соцсетей (собираются в src/pages/og/[key].jpg.ts) */
export const OG_W = 1200;
export const OG_H = 630;
export const ogHref = (key: string) => `/og/${key}.jpg`;

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

const ORG_NAME = 'Академия 3D GRIPINSKY';
const ORG_ID = SITE + '/#organization';

/** Код подтверждения сайта в Яндекс Вебмастере (тот же, что на Tilda) */
export const YANDEX_VERIFICATION = '3140c9df5cd54536';

interface OrgLinks { youtube?: string | null; vk?: string | null; telegramChannel?: string | null; yandexMaps?: string | null; email?: string | null }

export function organizationLd(site: OrgLinks) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: ORG_NAME,
    alternateName: 'GRIPINSKY',
    url: SITE + '/',
    logo: SITE + '/logo.png',
    ...(site.email ? { email: site.email } : {}),
    address: { '@type': 'PostalAddress', addressCountry: 'RU', addressLocality: 'Москва', streetAddress: 'Новый Арбат, 34' },
    sameAs: [site.youtube, site.vk, site.telegramChannel, site.yandexMaps?.replace(/reviews\/?$/, '')].filter(Boolean),
  };
}

/** Название сайта для выдачи (Google берёт его из WebSite на главной) */
export const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: ORG_NAME,
  alternateName: ['GRIPINSKY', 'Академия 3D Евгения Грипинского'],
  url: SITE + '/',
  inLanguage: 'ru',
  publisher: { '@id': ORG_ID },
};

const provider = { '@type': 'Organization', '@id': ORG_ID, name: ORG_NAME, url: SITE + '/' };

export interface CourseLdInput {
  name: string;
  description: string;
  /** Адрес страницы курса */
  path: string;
  /** Цены вариантов (одна или несколько), ровно как на странице */
  prices: number[];
  image?: string;
  /** Длительность в формате ISO 8601, например P12M */
  workload?: string;
}

/** Course: цена и валюта как на странице; документ об образовании не указываем (educationalCredentialAwarded не заполняем) */
export function courseLd({ name, description, path, prices, image, workload }: CourseLdInput) {
  const url = absUrl(path);
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name,
    description,
    url,
    inLanguage: 'ru',
    ...(image ? { image: absUrl(image) } : {}),
    provider,
    offers: prices.map((price) => ({
      '@type': 'Offer',
      price,
      priceCurrency: 'RUB',
      category: price === 0 ? 'Free' : 'Paid',
      availability: 'https://schema.org/InStock',
      url,
    })),
    hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', ...(workload ? { courseWorkload: workload } : {}) },
  };
}

/** Статья или история: автор и издатель академия */
export function articleLd(o: { headline: string; description: string; path: string; image: string; datePublished?: Date; dateModified?: Date }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: o.headline,
    description: o.description,
    mainEntityOfPage: absUrl(o.path),
    image: absUrl(o.image),
    ...(o.datePublished ? { datePublished: o.datePublished.toISOString() } : {}),
    ...(o.dateModified || o.datePublished ? { dateModified: (o.dateModified ?? o.datePublished)!.toISOString() } : {}),
    inLanguage: 'ru',
    author: provider,
    publisher: { ...provider, logo: { '@type': 'ImageObject', url: SITE + '/logo.png' } },
  };
}
