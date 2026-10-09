import { useEffect, useRef, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $cart, normalizeCart } from '../stores/cart';
import { quoteSet, type Catalog } from '../lib/pricing';

/**
 * Подсказка о скидке за набор, пока корзина пуста. Одна строка внизу экрана: не перекрывает первый экран
 * (появляется, когда он ушёл из вида), условия раскрываются по нажатию.
 */
export default function PrototypeCartHint({ cat }: { cat: Catalog }) {
  const cart = useStore($cart);
  const bar = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  const count = quoteSet(cat, normalizeCart(cat, cart)).count;
  const maxPct = Math.max(...cat.tiers.map((t) => t.pct));

  useEffect(() => {
    const hero = document.querySelector('.hero');
    if (!hero) { setShown(true); return; }
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting), { rootMargin: '0px 0px -40% 0px' });
    io.observe(hero);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const root = document.documentElement.style;
    if (count || !shown || !bar.current) { root.setProperty('--prototype-hint-h', '0px'); return; }
    const update = () => root.setProperty('--prototype-hint-h', `${bar.current?.offsetHeight ?? 0}px`);
    const observer = new ResizeObserver(update); observer.observe(bar.current); update();
    return () => { observer.disconnect(); root.setProperty('--prototype-hint-h', '0px'); };
  }, [count, shown]);

  if (count) return null;
  return <div ref={bar} data-prototype-empty-cart aria-hidden={!shown} inert={!shown}
    class={`prototype-hint fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-bg-2 transition-transform duration-300 ${shown ? 'translate-y-0' : 'translate-y-full'}`}>
    <div class="wrap flex items-center justify-between gap-3 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
      <div class="min-w-0">
        <b class="t-small block">Набор курсов со скидкой до {maxPct}%</b>
        <details class="t-caption text-muted">
          <summary class="inline-flex min-h-[28px] cursor-pointer items-center underline underline-offset-4">Как считается скидка</summary>
          <p class="m-0 mt-1 max-w-[68ch]">{cat.tiers.map((t) => `${t.min === 4 ? 'от 4 курсов' : `${t.min} курса`}: ${t.pct}%`).join(', ')}. База сохраняет свою цену. Курс профессии с базой получает подарок вместо скидки. Дополнительные курсы участвуют в скидке за количество.</p>
        </details>
      </div>
      <a href="#profession" class="btn btn-primary shrink-0">Выбрать курс</a>
    </div>
  </div>;
}
