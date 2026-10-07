// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { loadEnv } from 'vite';

// Keystatic (админка контента) нужна только при локальной работе: в продакшен-сборку не попадает.
const isDev = process.argv.includes('dev');
const configEnv = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
const isIndexable = (process.env.PUBLIC_INDEXABLE ?? configEnv.PUBLIC_INDEXABLE ?? 'false') === 'true';
const githubPagesSite = process.env.GITHUB_PAGES_SITE;
const githubPagesBase = process.env.GITHUB_PAGES_BASE;


// Страницы скрытых курсов собираются с noindex (например, /podarok5): в sitemap их быть не должно
const hiddenCoursePaths = new Set(
  readdirSync('src/content/courses')
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(`src/content/courses/${f}`, 'utf8')))
    .filter((c) => c.status !== 'active')
    .map((c) => c.legacyPath),
);
const seoNoindexPaths = new Set(
  existsSync('src/content/page-seo')
    ? readdirSync('src/content/page-seo')
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(readFileSync('src/content/page-seo/' + f, 'utf8')))
      .filter((p) => p.noindex)
      .map((p) => p.route.replace(/\/+$/, '') || '/')
    : [],
);

export default defineConfig({
  site: githubPagesSite || 'https://gripinsky.ru',
  ...(githubPagesBase ? { base: githubPagesBase } : {}),
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  // Адреса как на Tilda: без слэша на конце (/interiorpro, /courses-page/visualization)
  trailingSlash: 'never',
  build: { format: 'file' },
  compressHTML: true,
  // На старом сайте /courses-page отдаёт 301 на /courses: повторяем (на хостинге заменить на 301 в nginx)
  // Лента новостей Tilda (/news) переехала в блог; сами статьи остались по адресам /tpost/…
  redirects: { '/courses-page': '/courses', '/news': '/blog' },
  server: { port: 4321, allowedHosts: ['.tuna.am'] },
  // Панель разработчика Astro подгружает свои модули на лету и мешает стабильной работе dev-сервера
  devToolbar: { enabled: false },
  image: {
    breakpoints: [480, 768, 1080, 1440, 1920],
  },
  integrations: [
    preact({ include: ['**/islands/**'] }),
    markdoc(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
        return isIndexable && !page.includes('/oplata/') && !page.includes('/keystatic')
          && !hiddenCoursePaths.has(pathname) && !seoNoindexPaths.has(pathname);
      },
    }),
    ...(isDev ? [react({ exclude: ['**/islands/**'] }), keystatic()] : []),
  ],
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Onest',
      cssVariable: '--font-onest',
      weights: ['400 800'],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'JetBrains Mono',
      cssVariable: '--font-jetbrains-mono',
      weights: [400, 500],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic'],
      fallbacks: ['ui-monospace', 'monospace'],
    },
  ],
  env: {
    schema: {
      CHECKOUT_MODE: envField.enum({ context: 'server', access: 'public', values: ['demo', 'getcourse', 'robokassa'], default: 'demo' }),
      GETCOURSE_ACCOUNT: envField.string({ context: 'server', access: 'secret', optional: true }),
      GETCOURSE_API_KEY: envField.string({ context: 'server', access: 'secret', optional: true }),
      ROBOKASSA_LOGIN: envField.string({ context: 'server', access: 'secret', optional: true }),
      ROBOKASSA_PASS1: envField.string({ context: 'server', access: 'secret', optional: true }),
      ROBOKASSA_PASS2: envField.string({ context: 'server', access: 'secret', optional: true }),
      ROBOKASSA_IS_TEST: envField.boolean({ context: 'server', access: 'public', default: true }),
      ROBOKASSA_HASH: envField.enum({ context: 'server', access: 'public', values: ['md5', 'sha256'], default: 'sha256' }),
      B24_WEBHOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      PUBLIC_YM_ID: envField.string({ context: 'client', access: 'public', optional: true }),
      PUBLIC_ANALYTICS: envField.boolean({ context: 'client', access: 'public', default: false }),
      PUBLIC_INDEXABLE: envField.boolean({ context: 'client', access: 'public', default: false }),
    },
  },
  vite: {
    plugins: [tailwindcss()],
    // Все браузерные зависимости собираем заранее при старте dev-сервера.
    // Иначе Vite находит их на лету, пересобирает и отдаёт 504 «Outdated Optimize Dep»:
    // острова (тест, конструктор, оформление) и админка Keystatic перестают загружаться.
    optimizeDeps: {
      include: [
        'preact', 'preact/hooks', 'preact/jsx-runtime', 'preact/compat',
        'nanostores', '@nanostores/preact',
        ...(isDev ? ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime', '@keystatic/core', '@keystatic/core/ui', '@keystatic/astro/ui'] : []),
      ],
    },
  },
});
