import { useEffect, useState, useRef } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $pkg, openCheckout } from '../stores/package';
import { quote, type Catalog } from '../lib/pricing';
import { rub, sp } from './ui';

interface Props { cat: Catalog }

/** Липкая панель «Ваш пакет»: появляется после блока профессий, прячется у карточки пакета и формы */
export default function StickyPackageBar({ cat }: Props) {
  const pkg = useStore($pkg);
  const [past, setPast] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [sheet, setSheet] = useState(false);
  const blockers = useRef(new Set<Element>());

  useEffect(() => {
    const anchor = document.getElementById('profession-title');
    const hide = ['package-summary', 'consult', 'site-footer'].map((id) => document.getElementById(id)).filter(Boolean) as Element[];
    // Положение заголовка профессий проверяем при прокрутке: при резком прыжке через всю страницу
    // IntersectionObserver не срабатывает, если элемент так и не попал в окно
    let raf = 0;
    const check = () => { raf = 0; if (anchor) setPast(anchor.getBoundingClientRect().bottom < 0); };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(check); };
    window.addEventListener('scroll', onScroll, { passive: true });
    check();
    const io2 = new IntersectionObserver((entries) => {
      for (const e of entries) e.isIntersecting ? blockers.current.add(e.target) : blockers.current.delete(e.target);
      setBlocked(blockers.current.size > 0);
    }, { threshold: 0 });
    hide.forEach((el) => io2.observe(el));
    const onFocus = (e: FocusEvent) => { if ((e.target as HTMLElement)?.matches?.('input, textarea, select')) setBlocked(true); };
    const onBlur = () => setBlocked(blockers.current.size > 0);
    document.addEventListener('focusin', onFocus);
    document.addEventListener('focusout', onBlur);
    return () => { window.removeEventListener('scroll', onScroll); io2.disconnect(); document.removeEventListener('focusin', onFocus); document.removeEventListener('focusout', onBlur); };
  }, []);

  const visible = past && !blocked;
  const barRef = useRef<HTMLDivElement>(null);

  // Высота видимой панели для остальных фиксированных слоёв (cookie-баннер встаёт над ней)
  // и для scroll-padding-bottom: фокус и якоря не уходят под панель
  useEffect(() => {
    const root = document.documentElement;
    const set = () => root.style.setProperty('--sticky-bar-h', visible && barRef.current ? `${barRef.current.offsetHeight}px` : '0px');
    set();
    const ro = new ResizeObserver(set);
    if (barRef.current) ro.observe(barRef.current);
    return () => { ro.disconnect(); root.style.setProperty('--sticky-bar-h', '0px'); };
  }, [visible, sheet]);
  const q = quote(cat, pkg);
  const prof = cat.professions[pkg.prof];
  const title = [pkg.base ? 'База' : null, ...q.lines.filter((l) => l.kind === 'item' && l.id !== 'baza').map((l) => l.name)].filter(Boolean).join(' + ');
  const tariff = cat.tariffs.find((t) => t.id === pkg.tariff)!;
  const checkout = () => openCheckout({ kind: 'package' });

  return (
    <div ref={barRef} aria-hidden={!visible} inert={!visible}
      class={`fixed inset-x-0 bottom-0 z-50 border-t border-line-strong bg-[rgb(17_19_19/0.96)] backdrop-blur-md transition-transform duration-300 ${visible ? 'translate-y-0' : 'translate-y-full'}`}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {sheet && (
        <div class="wrap max-h-[50vh] overflow-y-auto overscroll-contain border-b border-line py-4" id="sticky-sheet">
          <span class="t-overline">Состав пакета</span>
          <ul class="t-small m-0 mt-2 flex list-none flex-col gap-1.5 p-0">
            {q.lines.map((l) => (
              <li key={l.id} class="flex justify-between gap-3">
                <span class="text-ink-2">{l.name}</span>
                <b class="whitespace-nowrap">{l.kind === 'item' || l.kind === 'format' ? (l.price ? rub(l.price) : 'включено') : l.kind === 'included' ? 'входит' : 'в подарок'}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div class="wrap flex min-h-16 items-center gap-3 py-2 md:gap-5">
        <button type="button" onClick={() => setSheet(!sheet)} aria-expanded={sheet} aria-controls="sticky-sheet"
          class="flex min-w-0 flex-1 flex-col items-start border-0 bg-transparent p-0 text-left">
          <span class="whitespace-nowrap t-overline">Ваш пакет<span class="hidden sm:inline">{q.tariffApplied ? `, ${tariff.name}` : ''}</span> <span aria-hidden="true">{sheet ? '▾' : '▴'}</span></span>
          <span class="t-small w-full truncate font-semibold">{title || prof.title}</span>
        </button>
        <span class="flex flex-col items-end" aria-live="polite">
          <span class="t-title whitespace-nowrap font-extrabold">{rub(q.total)}</span>
          <span class="t-caption whitespace-nowrap text-muted">или {sp(q.monthly)}&nbsp;₽/мес</span>
        </span>
        <a href="#profession" class="btn btn-secondary btn-sm hidden md:inline-flex">Изменить</a>
        <button type="button" onClick={checkout} class="btn btn-primary btn-sm">Оформить</button>
      </div>
    </div>
  );
}
