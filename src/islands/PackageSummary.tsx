import { Fragment } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $pkg, initFromUrl, packageUrl, afterIslandsHydrated } from '../stores/package';
import { addCourses } from '../stores/cart';
import { supportOf, quote, availableAddons, summarize, type Catalog } from '../lib/pricing';
import { reachGoal } from '../lib/analytics';
import { rub, sp, Gift, CheckBox } from './ui';

interface Props { cat: Catalog; addonTexts: Record<string, string>; giftTexts: Record<string, string>; installmentNote: string }

export default function PackageSummary({ cat, addonTexts, giftTexts, installmentNote }: Props) {
  const pkg = useStore($pkg);
  const [copied, setCopied] = useState(false);
  useEffect(() => { afterIslandsHydrated(initFromUrl); }, []);

  const q = quote(cat, pkg);
  const prof = cat.professions[pkg.prof];
  const addons = availableAddons(cat, pkg);
  const tariff = cat.tariffs.find((t) => t.id === pkg.tariff)!;

  useEffect(() => {
    try { sessionStorage.setItem('gr-package-summary', summarize(q)); } catch {}
  }, [q.total, q.items.join()]);

  const toggleAddon = (id: string) => {
    const on = pkg.addons.includes(id);
    $pkg.setKey('addons', on ? pkg.addons.filter((a) => a !== id) : [...pkg.addons, id]);
    reachGoal('addon_toggle', { id, on: !on });
  };
  const checkout = () => {
    reachGoal('package_checkout', { sum: q.total, items: q.items.join(',') });
    addCourses(q.lines.filter((l) => l.kind === 'item').map((l) => l.id), { support: supportOf(pkg.tariff), tariff: pkg.tariff });
  };
  const copy = async () => {
    const url = packageUrl(pkg);
    let ok = false;
    // Clipboard API есть только на https и localhost; по http в локальной сети её нет
    try { await navigator.clipboard.writeText(url); ok = true; } catch {}
    if (!ok) {
      const ta = document.createElement('textarea');
      ta.value = url;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand('copy'); } catch {}
      ta.remove();
    }
    if (!ok) { window.prompt('Скопируйте ссылку на пакет', url); return; }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const courses = q.lines.filter((l) => l.kind === 'item');
  const bonuses = q.lines.filter((l) => l.kind === 'gift' || l.kind === 'included');
  // Формула пакета: «база + профессия + подарок = итог» (наглядная сводка, подробности в карточке справа)
  const baseLine = courses.find((l) => l.id === 'baza');
  const formula: { label: string; value: string; gift?: boolean }[] = [
    ...(baseLine ? [{ label: `База, «${tariff.name}»`, value: rub(baseLine.price + (q.tariffApplied ? tariff.extra : 0)) }] : []),
    ...courses.filter((l) => l.id !== 'baza').map((l) => ({ label: l.name, value: rub(l.price) })),
    { label: prof.gift.name, value: 'в подарок', gift: true },
  ];

  return (
    <div class="grid gap-8 md:grid-cols-[7fr_5fr] md:items-start md:gap-14">
      <div class="flex flex-col gap-3 border-y border-line py-5 md:col-span-2 md:flex-row md:flex-wrap md:items-center md:gap-x-5 md:gap-y-3 md:py-7" aria-hidden="true" data-formula>
        {formula.map((f, i) => (
          <Fragment key={f.label}>
            {i > 0 && <span class="t-h3 hidden text-muted md:inline">+</span>}
            <span class="flex items-baseline justify-between gap-3 md:min-w-0 md:flex-1 md:flex-col md:justify-start md:gap-1">
              <span class="t-small text-muted">{f.label}</span>
              <b class={`t-title whitespace-nowrap ${f.gift ? 'font-semibold' : ''}`}>{f.value}</b>
            </span>
          </Fragment>
        ))}
        <span class="t-h3 hidden text-muted md:inline">=</span>
        <span class="flex flex-col gap-1 pt-2 md:flex-[1.3] md:pt-0">
          <b class="t-num self-start border-b-2 border-lime">{rub(q.total)}</b>
          <span class="t-small text-muted">или {sp(q.monthly)}&nbsp;₽/мес{q.savings > 0 ? `, выгода ${rub(q.savings)}` : ''}</span>
        </span>
      </div>
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3 border-b border-line pb-5 sm:flex-row sm:items-center sm:gap-4">
          <span class="inline-flex items-center gap-2 text-muted"><Gift /><span class="t-overline">Подарок к профессии</span></span>
          <span class="flex-1">
            <b>{prof.gift.name}</b>
            <span class="t-small block text-muted">{giftTexts[pkg.prof]}</span>
          </span>
          {prof.gift.value && <span class="t-small whitespace-nowrap"><s class="text-muted">{rub(prof.gift.value)}</s> <b class="text-ink">0&nbsp;₽</b></span>}
        </div>

        {addons.length > 0 && (
          <fieldset class="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend class="t-overline mb-2.5">Усилить по желанию</legend>
            <div class="grid gap-2.5 sm:grid-cols-2">
              {addons.map((a) => {
                const on = pkg.addons.includes(a.id);
                return (
                  <label key={a.id} class={`choice flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3 ${on ? '!border-ink !bg-surface-2' : ''}`}>
                    <input type="checkbox" class="sr-only" checked={on} onChange={() => toggleAddon(a.id)} />
                    <span class="mt-0.5"><CheckBox on={on} /></span>
                    <span class="flex flex-col">
                      <span class="t-small font-semibold">{a.name} <span class="font-medium text-muted">+{rub(a.price!)}</span></span>
                      <span class="t-caption text-muted">{addonTexts[a.id]}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      <aside id="package-summary" aria-labelledby="pkg-title" class="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 sm:p-6">
        <span id="pkg-title" class="t-title">Ваш пакет</span>

        <div class="flex flex-col gap-2">
          <span class="t-overline">Курсы</span>
          {courses.map((l) => (
            <div key={l.id} class="t-small grid grid-cols-[1fr_auto] gap-3 border-b border-line pb-2">
              <span class="text-ink-2">{l.name}</span><b class="whitespace-nowrap">{rub(l.price)}</b>
            </div>
          ))}
        </div>

        <div class="flex flex-col gap-2">
          <span class="t-overline">Подарки и бонусы</span>
          {bonuses.map((l) => (
            <div key={l.id} class="t-small grid grid-cols-[1fr_auto] gap-3">
              <span class="text-ink-2">{l.name}</span>
              <span class="whitespace-nowrap">{l.value ? <s class="t-caption mr-2 text-muted">{rub(l.value)}</s> : null}<b class="text-ink">{l.kind === 'included' ? 'входит' : 'в подарок'}</b></span>
            </div>
          ))}
        </div>

        <div class="t-small flex flex-col gap-1.5 border-y border-line py-3">
          {q.tariffApplied ? (
            <span class="flex items-baseline justify-between gap-3">
              <span>Формат: <b>{tariff.name}</b> <a href="#base-format" class="link-muted t-small ml-1">изменить</a></span>
              <b class="whitespace-nowrap">{tariff.extra ? `+${rub(tariff.extra)}` : 'включено'}</b>
            </span>
          ) : (
            <span class="text-ink-2">Формат обучения выбирается вместе с базой. Нужна проверка работ по курсу профессии? Спросите на <a href="#consult" class="link">консультации</a>.</span>
          )}
        </div>

        <div class="flex flex-col gap-1 border-t border-line pt-4" aria-live="polite" aria-atomic="true">
          <span class="flex items-baseline justify-between"><span class="t-title font-semibold">Итого</span><span class="t-num">{rub(q.total)}</span></span>
          <span class="t-small text-muted">или {sp(q.monthly)}&nbsp;₽/мес в рассрочку на {cat.installmentMonths} мес.</span>
          {q.savings > 0 && <span class="t-small font-semibold text-muted">Ваша выгода {rub(q.savings)} по сравнению с покупкой по отдельности</span>}
        </div>

        <button type="button" class="btn btn-primary btn-lg btn-block" onClick={checkout}>Добавить в корзину</button>
        <span class="t-caption text-center leading-snug text-muted">В корзине можно изменить состав, затем перейти к оплате. {installmentNote}</span>
        <div class="t-small flex flex-wrap items-center justify-center gap-x-5 gap-y-1">
          <a href="#consult" class="link">Бесплатная консультация</a>
          <button type="button" onClick={copy} class="min-h-11 border-0 bg-transparent p-0 font-semibold text-muted">{copied ? 'Ссылка скопирована' : 'Скопировать ссылку на пакет'}</button>
        </div>
      </aside>
    </div>
  );
}
