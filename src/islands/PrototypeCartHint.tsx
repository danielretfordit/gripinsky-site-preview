import { useEffect, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $cart, normalizeCart } from '../stores/cart';
import { quoteSet, type Catalog } from '../lib/pricing';

export default function PrototypeCartHint({ cat }: { cat: Catalog }) {
  const cart = useStore($cart);
  const bar = useRef<HTMLDivElement>(null);
  const count = quoteSet(cat, normalizeCart(cat, cart)).count;
  useEffect(() => {
    if (count || !bar.current) return;
    const update = () => document.documentElement.style.setProperty('--prototype-hint-h', `${bar.current?.offsetHeight ?? 0}px`);
    const observer = new ResizeObserver(update); observer.observe(bar.current); update();
    return () => { observer.disconnect(); document.documentElement.style.removeProperty('--prototype-hint-h'); };
  }, [count]);
  if (count) return null;
  return <div ref={bar} data-prototype-empty-cart class="fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-bg-2 py-3">
    <div class="wrap flex flex-wrap items-center justify-between gap-3">
      <div><b class="t-small">Соберите свой набор курсов</b><p class="t-caption text-muted m-0">{cat.tiers.map(t => `${t.min === 4 ? 'От 4 курсов' : `${t.min} курса`}: ${t.pct}%`).join(' / ')}</p><details class="t-caption text-muted mt-1"><summary class="cursor-pointer underline">Как считается скидка</summary><p class="m-0 mt-2 max-w-[68ch]">База сохраняет свою цену. Курс профессии с базой получает подарок вместо скидки. Дополнительные курсы участвуют в скидке за количество.</p></details></div>
      <a href="#profession" class="btn btn-primary">Выбрать курс</a>
    </div>
  </div>;
}
