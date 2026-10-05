// Общие функции для скриптов аудита и прототипов
export async function prepare(page, url) {
  await page.addInitScript(() => { try { localStorage.setItem('gr-cookie-consent', 'necessary'); } catch {} });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90_000 });
  await page.waitForTimeout(800); // острова успевают гидрироваться
  await page.evaluate(async () => {
    await document.fonts.ready;
    // Все картинки грузим сразу, затем медленно прокручиваем страницу
    document.querySelectorAll('img[loading="lazy"]').forEach((i) => { i.loading = 'eager'; });
    const step = Math.round(innerHeight * 0.7);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) { scrollTo({ top: y, behavior: 'instant' }); await new Promise((r) => setTimeout(r, 140)); }
    document.documentElement.style.scrollBehavior = 'auto';
    scrollTo({ top: 0, behavior: 'instant' });
    const visible = [...document.images].filter((i) => i.offsetParent !== null || getComputedStyle(i).position === 'fixed');
    await Promise.all(visible.map((img) => img.complete && img.naturalWidth ? null : new Promise((r) => { img.addEventListener('load', r, { once: true }); img.addEventListener('error', r, { once: true }); setTimeout(r, 10000); })));
    await Promise.all(visible.map((img) => img.decode?.().catch(() => null)));
    // Анимации на скриншоте стоят на месте
    const s = document.createElement('style');
    s.textContent = '*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;transition:none!important;caret-color:transparent!important}';
    document.head.appendChild(s);
    const banner = document.querySelector('[data-cookie-banner], #cookie-banner');
    if (banner) banner.remove();
  });
  await page.waitForLoadState('networkidle').catch(() => null);
  await page.waitForTimeout(400);
}

// Фиксированная нижняя панель на полностраничном снимке рисуется посреди страницы: прячем на время снимка
export async function hideFixedBottom(page, hide = true) {
  await page.evaluate((h) => {
    for (const el of document.querySelectorAll('body *')) {
      const cs = getComputedStyle(el);
      if (cs.position === 'fixed' && el.tagName !== 'HEADER' && parseFloat(cs.bottom) <= 40 && cs.bottom !== 'auto') el.style.visibility = h ? 'hidden' : '';
    }
  }, hide);
}

