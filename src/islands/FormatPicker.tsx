import { sitePath } from '../lib/deployment';
import { useStore } from '@nanostores/preact';
import { $pkg } from '../stores/package';
import { addCourses } from '../stores/cart';
import { basePrice, baseSeparately, quoteBaseOnly, supportOf, type Catalog, type TariffId } from '../lib/pricing';
import { reachGoal } from '../lib/analytics';
import { rub, sp, Check, Cross, onRadioKeys } from './ui';

export interface TariffView { id: TariffId; name: string; sub: string; short: string; badge?: string | null; features: { ok: boolean; text: string }[] }
interface Props { cat: Catalog; tariffs: TariffView[]; trialHref: string; compact?: boolean }

export default function FormatPicker({ cat, tariffs, trialHref }: Props) {
  const pkg = useStore($pkg);
  const ids = tariffs.map((t) => t.id);
  const cur = tariffs.find((t) => t.id === pkg.tariff) ?? tariffs[0];
  const price = basePrice(cat, cur.id);
  // Честный якорь: те же курсы по отдельности с той же поддержкой
  const support = supportOf(cur.id);
  const separately = baseSeparately(cat, support);
  const pick = (id: TariffId) => { $pkg.setKey('tariff', id); reachGoal('tariff_select', { id }); };

  const buyBase = () => {
    const q = quoteBaseOnly(cat, cur.id);
    reachGoal('base_buy_click', { tariff: cur.id, sum: q.total });
    addCourses([cat.base.id], { support, tariff: cur.id });
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
                  <span class="t-title flex flex-wrap items-baseline gap-x-2 font-extrabold">
                    {t.name}
                    <span class="t-small font-medium text-muted">{t.sub}</span>
                    {t.badge && <span class="chip ml-1 !bg-surface-2 !text-muted">{t.badge}</span>}
                  </span>
                  <span class="t-small text-ink-2">{t.short}</span>
                </span>
                <span class="t-title whitespace-nowrap font-extrabold">{rub(basePrice(cat, t.id))}</span>
              </button>
            );
          })}
        </div>
        <a href={sitePath(trialHref)} class="link-muted t-small self-start">Сначала попробовать: бесплатные уроки →</a>
      </div>

      <aside aria-label="База 3D-визуализатора" class="flex flex-col gap-4 rounded-card border border-line bg-surface p-6">
        <div class="flex flex-col gap-1">
          <span class="t-title">{cat.base.name}</span>
          <span class="t-overline">Формат: {cur.name}</span>
        </div>
        <ul class="m-0 flex list-none flex-col gap-2 p-0">
          {cur.features.map((f) => (
            <li key={f.text} class="t-small flex items-start gap-2.5 leading-snug text-ink-2">
              <span class={`mt-0.5 shrink-0 ${f.ok ? 'text-muted' : 'text-muted'}`}>{f.ok ? <Check /> : <Cross />}</span>
              {f.text}
            </li>
          ))}
        </ul>
        <div class="flex flex-col gap-1 border-t border-line pt-4" aria-live="polite">
          <span class="t-num font-extrabold">{rub(price)}</span>
          <span class="t-small text-muted">или {sp(Math.ceil(price / cat.installmentMonths))}&nbsp;₽/мес в рассрочку на {cat.installmentMonths} мес.</span>
          {separately > price && <span class="t-small text-muted">По отдельности курсы базы {support === 'self' ? 'без поддержки' : 'с поддержкой'} стоят {rub(separately)}, «ИИ в 3D» входит бесплатно</span>}
        </div>
        <a href="#profession" class="link t-small">Посмотреть специализации →</a>
        <button type="button" class="btn btn-primary btn-block" onClick={buyBase}>Добавить базу в корзину</button>

      </aside>
    </div>
  );
}
