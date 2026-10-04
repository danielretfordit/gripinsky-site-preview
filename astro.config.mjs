// @ts-check
import { defineConfig, envField, fontProviders } from 'astro/config';
import node from '@astrojs/node';
import preact from '@astrojs/preact';
import react from '@astrojs/react';
import markdoc from '@astrojs/markdoc';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import tailwindcss from '@tailwindcss/vite';

// Keystatic (админка контента) нужна только при локальной работе: в продакшен-сборку не попадает.
const isDev = process.argv.includes('dev');

export default defineConfig({
  site: 'https://gripinsky.ru',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  // Адреса как на Tilda: без слэша на конце (/interiorpro, /courses-page/visualization)
  trailingSlash: 'never',
  build: { format: 'file' },
  compressHTML: true,
  server: { port: 4321, allowedHosts: ['.tuna.am'] },
  image: {
    breakpoints: [480, 768, 1080, 1440, 1920],
  },
  integrations: [
    preact({ include: ['**/islands/**'] }),
    markdoc(),
    sitemap({
      filter: (page) => !page.includes('/oplata/') && !page.includes('/keystatic'),
    }),
    ...(isDev ? [react({ exclude: ['**/islands/**'] }), keystatic()] : []),
  ],
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: 'Inter Tight',
      cssVariable: '--font-inter-tight',
      weights: [400, 500, 600, 700, 800],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic'],
      fallbacks: ['system-ui', 'sans-serif'],
    },
    {
      provider: fontProviders.fontsource(),
      name: 'Caveat',
      cssVariable: '--font-caveat',
      weights: [500, 600],
      styles: ['normal'],
      subsets: ['latin', 'cyrillic'],
      fallbacks: ['cursive'],
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
  },
});
