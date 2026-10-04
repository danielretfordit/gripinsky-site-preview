import { PUBLIC_ANALYTICS, PUBLIC_YM_ID } from 'astro:env/client';

type Consent = 'all' | 'necessary';
const KEY = 'gr-cookie-consent';

declare global {
  interface Window { ym?: (...args: unknown[]) => void; dataLayer?: unknown[] }
}

export function getConsent(): Consent | null {
  try { return (localStorage.getItem(KEY) as Consent | null) ?? null; } catch { return null; }
}

export function setConsent(value: Consent) {
  try { localStorage.setItem(KEY, value); } catch {}
  if (value === 'all') loadMetrika();
}

let loaded = false;
function loadMetrika() {
  if (loaded || !PUBLIC_ANALYTICS || !PUBLIC_YM_ID) return;
  loaded = true;
  const id = Number(PUBLIC_YM_ID);
  window.dataLayer = window.dataLayer || [];
  const ym = function (...args: unknown[]) { ((ym as unknown as { a: unknown[] }).a ||= []).push(args); };
  (ym as unknown as { l: number }).l = Date.now();
  window.ym = window.ym || ym;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://mc.yandex.ru/metrika/tag.js';
  document.head.appendChild(s);
  window.ym(id, 'init', { clickmap: true, trackLinks: true, accurateTrackBounce: true, webvisor: true, ecommerce: 'dataLayer' });
}

export function initAnalytics() {
  if (getConsent() === 'all') loadMetrika();
}

/** Цель Метрики. Без согласия или с выключенной аналитикой просто ничего не делает */
export function reachGoal(goal: string, params?: Record<string, unknown>) {
  if (import.meta.env.DEV) console.debug('[goal]', goal, params ?? '');
  if (!loaded || !window.ym || !PUBLIC_YM_ID) return;
  window.ym(Number(PUBLIC_YM_ID), 'reachGoal', goal, params);
}

export function ecommerceAdd(products: { id: string; name: string; price: number }[]) {
  if (!loaded) return;
  window.dataLayer?.push({ ecommerce: { currencyCode: 'RUB', add: { products } } });
}
