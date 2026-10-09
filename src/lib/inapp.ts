// Встроенные браузеры приложений (Telegram, VK, Instagram, WebView Android): у них свои ограничения.
// Банковские приложения и СБП из них открываются не всегда, localStorage может быть отдельным от обычного браузера,
// окно может не иметь адресной строки. Модуль только определяет среду; поведение решают компоненты.

export type InAppKind = 'telegram' | 'vk' | 'instagram' | 'facebook' | 'webview' | null;

export function detectInApp(ua = navigator.userAgent, w: Window & Record<string, unknown> = window as never): InAppKind {
  if ('TelegramWebviewProxy' in w || 'TelegramWebview' in w || /Telegram/i.test(ua)) return 'telegram';
  if (/VKClient|VKAndroidApp|vk_app|\bVK\//i.test(ua)) return 'vk';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'facebook';
  // Android WebView помечает себя «; wv)»; iOS WKWebView без Safari в строке агента
  if (/; wv\)/.test(ua) || (/iPhone|iPad|iPod/.test(ua) && /AppleWebKit/.test(ua) && !/Safari\//.test(ua) && !/CriOS|FxiOS|EdgiOS|YaBrowser/.test(ua))) return 'webview';
  return null;
}

export const isAndroid = (ua = navigator.userAgent) => /Android/i.test(ua);
export const isIOS = (ua = navigator.userAgent) => /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);

/** Ссылка, которая на Android открывает адрес в Chrome (или браузере по умолчанию) вместо встроенного окна */
export function androidExternalUrl(url: string): string {
  const u = new URL(url, location.href);
  return `intent://${u.host}${u.pathname}${u.search}${u.hash}#Intent;scheme=${u.protocol.replace(':', '')};S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
}

/** Копирует текст в буфер; во встроенных браузерах Clipboard API бывает недоступен, тогда через выделение */
export async function copyText(text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* запасной путь ниже */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;inset:0 auto auto 0;opacity:0';
    document.body.append(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

/** Ставит на <html> классы is-inapp и is-inapp-<вид>: по ним стили и подсказки */
export function markInApp(): InAppKind {
  const kind = detectInApp();
  if (kind) document.documentElement.classList.add('is-inapp', `is-inapp-${kind}`);
  return kind;
}
