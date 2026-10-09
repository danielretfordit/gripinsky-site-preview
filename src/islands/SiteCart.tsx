import { useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $cart, $cartOpen, CART_KEY, initializeCart, normalizeCart, addCourses, removeCourse, setCartSupport } from '../stores/cart';
import { openCheckout } from '../stores/package';
import { quoteSet, type Catalog } from '../lib/pricing';
import { rub, plural } from '../lib/format';

export default function SiteCart({ cat, discountGuide = false }: { cat: Catalog; discountGuide?: boolean }) {
  const cart = useStore($cart);
  const expanded = useStore($cartOpen);
  const q = quoteSet(cat, normalizeCart(cat, cart));
  const dialog = useRef<HTMLDialogElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const count = q.count;
  useEffect(() => {
    initializeCart(cat);
    const updateButtons = () => {
      document.querySelectorAll<HTMLInputElement>('[data-cart-select]').forEach(input => {
        const id = input.dataset.cartSelect!;
        input.disabled = id !== cat.base.id && !Object.hasOwn(cat.courses, id);
        input.checked = $cart.get().ids.includes(id);
      });
      document.querySelectorAll<HTMLButtonElement>('[data-cart-add]').forEach((b) => {
      const id = b.dataset.cartAdd!;
      const available = id === cat.base.id || Object.hasOwn(cat.courses, id);
      b.disabled = !available;
      const selected = $cart.get().ids.includes(id);
      b.setAttribute('aria-pressed', String(selected));
      const label = b.querySelector('[data-cart-label]');
      if (label) label.textContent = selected ? 'В корзине' : 'В корзину';
    });
    };
    const change = (e: Event) => {
      const input = e.target as HTMLInputElement;
      if (!input.matches('[data-cart-select]') || input.disabled) return;
      const id = input.dataset.cartSelect!;
      if (input.checked) { const current = $cart.get(); $cart.set({ ...current, ids: [...new Set([...current.ids, id])] }); }
      else removeCourse(id);
    };
    const unsubscribe = $cart.subscribe((value) => {
      try { localStorage.setItem(CART_KEY, JSON.stringify(normalizeCart(cat, value))); } catch { /* корзина работает и без хранилища */ }
      updateButtons();
    });
    const click = (e: MouseEvent) => {
      const b = (e.target as Element)?.closest<HTMLButtonElement>('[data-cart-add]');
      if (!b || b.disabled) return;
      const id = b.dataset.cartAdd!;
      if (id !== cat.base.id && !Object.hasOwn(cat.courses, id)) return;
      addCourses([id]);
    };
    const storage = (e: StorageEvent) => {
      if (e.key !== CART_KEY) return;
      try { $cart.set(normalizeCart(cat, JSON.parse(e.newValue ?? 'null'))); } catch { /* повреждённое значение игнорируем */ }
    };
    document.addEventListener('click', click);
    document.addEventListener('change', change);
    window.addEventListener('storage', storage);
    return () => { unsubscribe(); document.removeEventListener('click', click); document.removeEventListener('change', change); window.removeEventListener('storage', storage); };
  }, []);
  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (expanded && !el.open) { opener.current = document.activeElement as HTMLElement; el.showModal(); }
    if (!expanded && el.open) { el.close(); if (!document.querySelector('dialog[open]')) opener.current?.focus({ preventScroll: true }); }
  }, [expanded]);
  useEffect(() => {
    const update = () => {
      const height = count && bar.current ? `${bar.current.offsetHeight}px` : '0px';
      document.documentElement.style.setProperty('--sticky-bar-h', height);
      document.documentElement.style.setProperty('--cart-safe-space', height);
    };
    update();
    const ro = new ResizeObserver(update);
    if (bar.current) ro.observe(bar.current);
    return () => { ro.disconnect(); document.documentElement.style.setProperty('--sticky-bar-h', '0px'); document.documentElement.style.setProperty('--cart-safe-space', '0px'); };
  }, [count]);
  const checkout = () => {
    if (!count) return;
    dialog.current?.close();
    $cartOpen.set(false);
    openCheckout({ kind: 'set', selection: normalizeCart(cat, cart) });
  };
  const discounted = q.lines.filter((l) => l.kind === 'item').reduce((sum, l) => sum + Math.max(0, (l.value ?? l.price) - l.price), 0);
  return <>
    {count > 0 && <div ref={bar} data-site-cart class="site-cart-bar fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-bg-2" style={{ paddingTop: '12px', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <div class="site-cart-bar__inner mx-auto flex w-full max-w-[1440px] min-w-0 items-center gap-3 sm:gap-6">
        <button type="button" class="site-cart-bar__open min-h-11 min-w-0 flex-1 text-left" onClick={() => $cartOpen.set(true)} aria-haspopup="dialog" aria-label="Открыть корзину">
          <span class="t-caption block text-muted">В корзине: {count} {plural(count, ['курс', 'курса', 'курсов'])}</span>
          <span class="t-small block font-semibold">Открыть корзину</span>
        </button>
        <div class="site-cart-bar__price shrink-0 text-right" aria-live="polite"><b class="site-cart-bar__total t-title block whitespace-nowrap">{rub(q.total)}</b>{q.pct > 0 && <span class="t-caption block text-muted">Скидка {q.pct}%</span>}</div>
        <button type="button" class="site-cart-bar__checkout btn btn-primary btn-sm" onClick={checkout}>Оформить</button>
      </div>
      {discountGuide && <div class="wrap mt-2 flex flex-wrap items-start justify-between gap-2 t-caption text-muted" aria-live="polite"><div><span class="block">{cat.tiers.map(t => `${t.min === 4 ? 'От 4 курсов' : `${t.min} курса`}: ${t.pct}%`).join(' / ')}</span><span class="block">{q.next ? `Ещё ${q.next.need} ${plural(q.next.need, ['курс', 'курса', 'курсов'])} до скидки ${q.next.pct}%` : q.pct > 0 ? 'Максимальная скидка за количество' : 'Скидка зависит от выбранных курсов'}</span></div><details><summary class="cursor-pointer underline">Как считается скидка</summary><p class="max-w-[68ch]">2 курса: 15%, 3 курса: 20%, от 4 курсов: 22%. База сохраняет свою цену. Курс профессии с базой получает подарок вместо скидки. Дополнительные курсы участвуют в скидке за количество.</p></details></div>}
    </div>}
    <dialog ref={dialog} data-cart-dialog aria-labelledby="cart-title" class="m-auto max-h-[90dvh] w-[min(720px,calc(100vw-24px))] overflow-hidden open:flex open:flex-col rounded-card border border-line-strong bg-bg-2 p-0 text-ink backdrop:bg-black/70"
      onClose={() => { if (!dialog.current?.open) $cartOpen.set(false); }} onCancel={(e) => { e.preventDefault(); $cartOpen.set(false); }} onClick={(e) => { if (e.target === dialog.current) $cartOpen.set(false); }}>
      <div class="flex shrink-0 items-center justify-between gap-4 px-5 py-4 sm:px-8 sm:py-5"><h2 id="cart-title" class="t-h3">Ваш пакет курсов</h2><button type="button" class="h-11 w-11 text-2xl" aria-label="Закрыть корзину" onClick={() => $cartOpen.set(false)}>×</button></div>
      {count ? <>
        <div class="min-h-0 overflow-y-auto overscroll-contain px-5 sm:px-8" data-cart-scroll>
        {!cart.ids.includes(cat.base.id) && <fieldset class="mb-4 border-0 p-0"><legend class="t-small mb-3 text-muted">Формат для всех выбранных курсов</legend><div class="grid grid-cols-2 gap-2">
          <label class="t-caption flex min-h-11 cursor-pointer items-center gap-2 rounded-field border border-line-strong p-2"><input type="radio" style={{ accentColor: "var(--color-lime)", width: "16px", height: "16px", flexShrink: 0 }} name="cart-support" value="chat" checked={cart.support === 'chat' && cart.tariff !== 'mentor'} onChange={() => setCartSupport('chat')} />С чатом поддержки</label>
          <label class="t-caption flex min-h-11 cursor-pointer items-center gap-2 rounded-field border border-line-strong p-2"><input type="radio" style={{ accentColor: "var(--color-lime)", width: "16px", height: "16px", flexShrink: 0 }} name="cart-support" value="self" checked={cart.support === 'self'} onChange={() => setCartSupport('self')} />Самостоятельно</label>
          <label class="t-caption flex min-h-11 cursor-pointer items-center gap-2 rounded-field border border-line-strong p-2"><input type="radio" name="cart-support" value="mentor" checked={cart.tariff === 'mentor'} onChange={() => $cart.set({ ...cart, tariff: 'mentor', support: 'chat' })} />С наставником (+{rub(cat.tariffs.find(t => t.id === 'mentor')?.extra ?? 0)})</label>
        </div><p class="t-caption mt-2 text-muted">Наставничество: личный наставник на 6 месяцев и 4–6 созвонов с разбором работ.</p></fieldset>}
        {cart.ids.includes(cat.base.id) && <fieldset class="mb-6 border-0 p-0"><legend class="t-small mb-3 text-muted">Формат базы</legend><div class="flex flex-wrap gap-3">{cat.tariffs.map((t) => <label class="t-caption flex min-h-11 cursor-pointer items-center gap-2 rounded-field border border-line-strong p-2"><input type="radio" style={{ accentColor: "var(--color-lime)", width: "16px", height: "16px", flexShrink: 0 }} name="cart-base-tariff" checked={(cart.tariff ?? (cart.support === 'self' ? 'lite' : 'opt')) === t.id} onChange={() => $cart.set({ ...cart, tariff: t.id, support: t.id === 'lite' ? 'self' : 'chat' })} />{t.name}</label>)}</div></fieldset>}
        <ul class="m-0 list-none p-0">{q.lines.map((line) => <li key={line.id} class="flex items-center gap-3 border-t border-line py-3">
          <div class="min-w-0 flex-1"><span class="t-small block">{line.name}</span>{line.note && <span class="t-caption text-muted">{line.note}</span>}</div>
          <span class="t-small whitespace-nowrap">{line.kind === 'gift' ? 'В подарок' : line.kind === 'included' ? 'Включено' : rub(line.price)}</span>
          {line.kind === 'item' && <button type="button" class="h-11 w-11 shrink-0 text-xl" aria-label={`Убрать ${line.name}`} onClick={() => removeCourse(line.id)}>×</button>}
        </li>)}</ul>
        <details class="t-small my-3 text-muted"><summary class="cursor-pointer py-2 underline">Как считается скидка</summary><p>База считается одной позицией и сохраняет свою цену. Курс профессии вместе с базой получает подарок вместо скидки. Другие курсы получают скидку за количество.</p></details>
        {q.dropped.length > 0 && <div class="t-caption mt-4 text-muted">Уже входят в выбранное обучение: {q.dropped.map((id) => <button class="mr-3 underline" type="button" onClick={() => removeCourse(id)}>{cat.courses[id]?.name ?? id} (убрать из выбора)</button>)}</div>}
        </div>
        <div class="shrink-0 border-t border-line-strong px-5 py-4 sm:px-8">
        <div aria-live="polite">
          {discounted > 0 && <p class="t-small mb-3 flex justify-between"><span>Скидка за курсы {q.pct}%</span><span>−{rub(discounted)}</span></p>}
          <p class="flex items-baseline justify-between gap-4"><b>Итого</b><b class="t-num">{rub(q.total)}</b></p>
          {q.next && <p class="t-caption mt-3 text-muted">При выборе от {q.count + q.next.need} курсов скидка на участвующие в акции курсы {q.next.pct}%.</p>}
        </div>
        <div class="mt-4 flex flex-wrap gap-2"><button type="button" class="btn btn-primary" onClick={checkout}>Оформить пакет</button><button type="button" class="btn btn-secondary !min-h-11 !px-4" style={{ fontSize: 'var(--type-small)' }} onClick={() => $cartOpen.set(false)}>Продолжить выбор</button></div></div>
      </> : <p class="p-5 text-muted">Корзина пуста. Добавьте интересующие курсы из каталога.</p>}
    </dialog>
  </>;
}
