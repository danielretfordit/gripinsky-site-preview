// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

// Keystatic (админка контента): локально всегда, на боевом сервере при KEYSTATIC_STORAGE=github
// (правки становятся коммитами в репозиторий). В промежуточную публикацию на GitHub Pages не попадает.
const isDev = process.argv.includes('dev');
const withAdmin = isDev || (process.env.KEYSTATIC_STORAGE ?? '') === 'github';
const configEnv = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
const isIndexable = (process.env.PUBLIC_INDEXABLE ?? configEnv.PUBLIC_INDEXABLE ?? 'false') === 'true';
const githubPagesSite = process.env.GITHUB_PAGES_SITE;
const githubPagesBase = process.env.GITHUB_PAGES_BASE;
const staticPreview = (process.env.PUBLIC_STATIC_PREVIEW ?? configEnv.PUBLIC_STATIC_PREVIEW ?? 'false') === 'true';

/** Черновики дизайна (/design/*) нужны локально и в промежуточной публикации, но не на боевом сайте */
const stripDesignDrafts = {
  name: 'gripinsky:strip-design-drafts',
  hooks: {
    /** @param {{ dir: URL, logger: import('astro').AstroIntegrationLogger }} options */
    'astro:build:done': ({ dir, logger }) => {
      if (staticPreview) return;
      const drafts = fileURLToPath(new URL('design/', dir));
      if (!existsSync(drafts)) return;
      rmSync(drafts, { recursive: true, force: true });
      logger.info('черновики /design убраны из боевой сборки');
    },
  },
};


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
  build: { format: 'directory' },
  compressHTML: true,
  // Источник запросов к API проверяет src/middleware.ts: встроенная проверка Astro блокирует
  // уведомление Robokassa (форма с чужого домена), а JSON-запросы не проверяет вовсе
  security: {
    checkOrigin: false,
    // Политика содержимого: Astro кладёт в <meta http-equiv> хеши своих встроенных скриптов и стилей.
    // Скрипты только свои и Яндекс Метрики; style="" в разметке разрешены (атрибуты, не элементы).
    // Запрет встраивания сайта в iframe и HSTS отдаёт nginx (deploy/nginx/security-headers.conf).
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'self'",
        "img-src 'self' data: blob: https://mc.yandex.ru https://mc.yandex.com",
        "font-src 'self'",
        "media-src 'self'",
        "connect-src 'self' https://mc.yandex.ru https://mc.yandex.com wss://mc.yandex.com",
        "frame-src https://mc.yandex.ru https://mc.yandex.com",
        "manifest-src 'self'",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
      ],
      scriptDirective: { resources: ["'self'", 'https://mc.yandex.ru', 'https://mc.yandex.com', 'https://yastatic.net'] },
      styleDirective: { resources: ["'self'", { resource: "'unsafe-inline'", kind: 'attribute' }] },
    },
  },
  // На старом сайте /courses-page отдаёт 301 на /courses: повторяем (на хостинге заменить на 301 в nginx)
  // Лента новостей Tilda (/news) переехала в блог; сами статьи остались по адресам /tpost/…
  redirects: { '/courses-page': '/courses' },
  server: { port: 4321, allowedHosts: ['.tuna.am'] },
  // Панель разработчика Astro подгружает свои модули на лету и мешает стабильной работе dev-сервера
  devToolbar: { enabled: false },
  image: {
    breakpoints: [480, 768, 1080, 1440, 1920],
  },
  integrations: [
    stripDesignDrafts,
    preact({ include: ['**/islands/**'] }),
    markdoc(),
    sitemap({
      filter: (page) => {
        const pathname = new URL(page).pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
        return isIndexable && !page.includes('/oplata/') && !page.includes('/keystatic') && !page.includes('/design/')
          && !hiddenCoursePaths.has(pathname) && !seoNoindexPaths.has(pathname);
      },
    }),
    ...(withAdmin ? [react({ exclude: ['**/islands/**'] }), keystatic()] : []),
  ],
  fonts: [
    // Inter: основной шрифт. Локально (без CDN), только latin и cyrillic, с метриками запасного шрифта,
    // чтобы текст не прыгал при загрузке. Onest и прочие гарнитуры остались только в архиве дизайн-вариантов.
    {
      provider: fontProviders.fontsource(),
      name: 'Inter',
      cssVariable: '--font-inter',
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
      // Тестовый режим Robokassa задаётся явно: без значения прямая оплата не включается (заявка уходит в CRM)
      ROBOKASSA_IS_TEST: envField.boolean({ context: 'server', access: 'public', optional: true }),
      ROBOKASSA_HASH: envField.enum({ context: 'server', access: 'public', values: ['md5', 'sha256'], default: 'sha256' }),
      B24_WEBHOOK_URL: envField.string({ context: 'server', access: 'secret', optional: true }),
      // За nginx: IP клиента берётся из X-Real-IP (ставит только наш прокси)
      TRUST_PROXY: envField.boolean({ context: 'server', access: 'public', default: false }),
      // Файл базы заказов Robokassa (SQLite)
      ORDERS_DB: envField.string({ context: 'server', access: 'public', default: './var/orders.db' }),
      // Ключ для /api/admin/status (состояние интеграций без значений секретов)
      ADMIN_STATUS_TOKEN: envField.string({ context: 'server', access: 'secret', optional: true }),
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
