import { useStore } from '@nanostores/preact';
import { $pkg, openCheckout } from '../stores/package';
import { basePrice, quoteBaseOnly, type Catalog, type TariffId } from '../lib/pricing';
import { reachGoal } from '../lib/analytics';
import { rub, sp, Check, Cross, onRadioKeys, scrollToId } from './ui';

export interface TariffView { id: TariffId; name: string; sub: string; short: string; badge?: string | null; features: { ok: boolean; text: string }[] }
interface Props { cat: Catalog; tariffs: TariffView[]; trialHref: string }

export default function FormatPicker({ cat, tariffs, trialHref }: Props) {
  const pkg = useStore($pkg);
  const ids = tariffs.map((t) => t.id);
  const cur = tariffs.find((t) => t.id === pkg.tariff) ?? tariffs[0];
  const price = basePrice(cat, cur.id);
  const pick = (id: TariffId) => { $pkg.setKey('tariff', id); reachGoal('tariff_select', { id }); };

  const buyBase = () => {
    const q = quoteBaseOnly(cat, cur.id);
    reachGoal('base_buy_click', { tariff: cur.id, sum: q.total });
    openCheckout({ kind: 'base', tariff: cur.id });
  };

  return (
    <div class="grid gap-8 md:grid-cols-[7fr_5fr] md:items-start md:gap-14">
      <div class="flex flex-col gap-6">
        <div role="radiogroup" aria-labelledby="format-title" class="flex flex-col gap-2.5">
          {tariffs.map((t) => {
            const on = t.id === cur.id;
            return (
              <button type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} data-value={t.id} key={t.id}
                onClick={() => pick(t.id)} onKeyDown={(e) => onRadioKeys(e, ids, cur.id, (id) => pick(id as TariffId))}
                class="choice grid min-h-[72px] grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 text-left">
                <span class="radio-dot" aria-hidden="true" />
                <span class="flex flex-col gap-0.5">
                  <span class="flex flex-wrap items-baseline gap-x-2 text-[19px] font-extrabold">
                    {t.name}
                    <span class="text-[15px] font-medium text-muted">{t.sub}</span>
                    {t.badge && <span class="chip ml-1 !bg-surface-2 !text-muted">{t.badge}</span>}
                  </span>
                  <span class="text-[15px] text-ink-2">{t.short}</span>
                </span>
                <span class="whitespace-nowrap text-[19px] font-extrabold">{rub(basePrice(cat, t.id))}</span>
              </button>
            );
          })}
        </div>
        <a href={trialHref} class="link-muted self-start text-[15px]">Сначала попробовать: бесплатные уроки →</a>
      </div>

      <aside aria-label="База 3D-визуализатора" class="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
        <div class="flex flex-col gap-1">
          <span class="text-[17px] font-bold">{cat.base.name}</span>
          <span class="t-overline">Формат: {cur.name}</span>
        </div>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          {cur.features.map((f) => (
            <li key={f.text} class="flex items-start gap-2.5 text-[15px] leading-snug text-ink-2">
              <span class={`mt-0.5 shrink-0 ${f.ok ? 'text-muted' : 'text-muted'}`}>{f.ok ? <Check /> : <Cross />}</span>
              {f.text}
            </li>
          ))}
        </ul>
        <div class="flex flex-col gap-1 border-t border-line pt-4" aria-live="polite">
          <span class="text-[36px] font-extrabold leading-none">{rub(price)}</span>
          <span class="text-[15px] text-muted">или {sp(Math.ceil(price / cat.installmentMonths))}&nbsp;₽/мес в рассрочку на {cat.installmentMonths} мес.</span>
          <span class="text-[14px] text-muted">По отдельности курсы базы стоят {rub(cat.base.separately)}, «ИИ в 3D» входит бесплатно</span>
        </div>
        <button type="button" class="btn btn-primary btn-lg btn-block" onClick={() => scrollToId('profession')}>Добавить профессию ↓</button>
        <button type="button" class="btn btn-secondary btn-block" onClick={buyBase}>Купить только базу</button>
        <span class="text-center text-[14px] text-muted">С профессией подарок: {cat.professions[pkg.prof].gift.name}</span>
      </aside>
    </div>
  );
}
