import type { APIRoute } from 'astro';
import { PUBLIC_INDEXABLE } from 'astro:env/client';
import { SITE } from '../lib/seo';

export const GET: APIRoute = () => {
  const body = PUBLIC_INDEXABLE
    ? [
        'User-agent: *',
        'Disallow: /api/',
        'Disallow: /oplata/',
        'Disallow: /keystatic',
        'Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&gclid',
        // Выбор профессии в ссылке на конструктор (/courses-page/visualization?prof=int) не создаёт новую страницу
        'Clean-param: prof /courses-page/visualization',
        '',
        `Sitemap: ${SITE}/sitemap-index.xml`,
      ].join('\n')
    : '# Пилот: индексация закрыта до запуска\nUser-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
};
