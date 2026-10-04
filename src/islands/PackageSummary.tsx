import { useEffect, useState } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $pkg, initFromUrl, packageUrl } from '../stores/package';
import { quote, availableAddons, summarize, type Catalog } from '../lib/pricing';
import { reachGoal } from '../lib/analytics';
import { rub, sp, Gift, CheckBox } from './ui';

interface Props { cat: Catalog; addonTexts: Record<string, string>; giftTexts: Record<string, string>; installmentNote: string }

export default function PackageSummary({ cat, addonTexts, giftTexts, installmentNote }: Props) {
  const pkg = useStore($pkg);
  const [copied, setCopied] = useState(false);
  useEffect(() => { initFromUrl(); }, []);

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
    window.dispatchEvent(new CustomEvent('gr:checkout', { detail: { kind: 'package' } }));
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(packageUrl(pkg)); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
  };

  const courses = q.lines.filter((l) => l.kind === 'item');
  const bonuses = q.lines.filter((l) => l.kind === 'gift' || l.kind === 'included');

  return (
    <div class="grid gap-8 md:grid-cols-[7fr_5fr] md:items-start md:gap-14">
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-3 rounded-2xl bg-sea-08 p-5 sm:flex-row sm:items-center sm:gap-4">
          <span class="inline-flex items-center gap-2 text-sea"><Gift /><span class="t-overline">Подарок к профессии</span></span>
          <span class="flex-1">
            <b>{prof.gift.name}</b>
            <span class="block text-[15px] text-muted">{giftTexts[pkg.prof]}</span>
          </span>
          {prof.gift.value && <span class="whitespace-nowrap text-[15px]"><s class="text-muted">{rub(prof.gift.value)}</s> <b class="text-lime">0&nbsp;₽</b></span>}
        </div>

        {addons.length > 0 && (
          <fieldset class="m-0 flex flex-col gap-2.5 border-0 p-0">
            <legend class="t-overline mb-2.5">Усилить по желанию</legend>
            <div class="grid gap-2.5 sm:grid-cols-2">
              {addons.map((a) => {
                const on = pkg.addons.includes(a.id);
                return (
                  <label key={a.id} class={`choice flex min-h-14 cursor-pointer items-start gap-3 px-4 py-3 ${on ? '!border-ink !bg-sea-14' : ''}`}>
                    <input type="checkbox" class="sr-only" checked={on} onChange={() => toggleAddon(a.id)} />
                    <span class="mt-0.5"><CheckBox on={on} /></span>
                    <span class="flex flex-col">
                      <span class="text-[15px] font-semibold">{a.name} <span class="font-medium text-muted">+{rub(a.price!)}</span></span>
                      <span class="text-[13px] text-muted">{addonTexts[a.id]}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}
      </div>

      <aside id="package-summary" aria-labelledby="pkg-title" class="flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-5 sm:p-6">
        <span id="pkg-title" class="text-[17px] font-bold">Ваш пакет</span>

        <div class="flex flex-col gap-2">
          <span class="t-overline">Курсы</span>
          {courses.map((l) => (
            <div key={l.id} class="grid grid-cols-[1fr_auto] gap-3 border-b border-line pb-2 text-[15px]">
              <span class="text-ink-2">{l.name}</span><b class="whitespace-nowrap">{rub(l.price)}</b>
            </div>
          ))}
        </div>

        <div class="flex flex-col gap-2">
          <span class="t-overline">Подарки и бонусы</span>
          {bonuses.map((l) => (
            <div key={l.id} class="grid grid-cols-[1fr_auto] gap-3 text-[15px]">
              <span class="text-ink-2">{l.name}</span>
              <span class="whitespace-nowrap">{l.value ? <s class="mr-2 text-[13px] text-muted">{rub(l.value)}</s> : null}<b class="text-lime">{l.kind === 'included' ? 'входит' : 'в подарок'}</b></span>
            </div>
          ))}
        </div>

        <div class="flex flex-col gap-1.5 rounded-xl bg-sea-08 px-4 py-3 text-[15px]">
          {q.tariffApplied ? (
            <span class="flex items-baseline justify-between gap-3">
              <span>Формат: <b>{tariff.name}</b> <a href="#base-format" class="link-sea ml-1 text-[14px]">изменить</a></span>
              <b class="whitespace-nowrap">{tariff.extra ? `+${rub(tariff.extra)}` : 'включено'}</b>
            </span>
          ) : (
            <span class="text-ink-2">Формат обучения выбирается вместе с базой. Нужна проверка работ по курсу профессии? Спросите на <a href="#consult" class="link">консультации</a>.</span>
          )}
        </div>

        <div class="flex flex-col gap-1 border-t border-line pt-4" aria-live="polite" aria-atomic="true">
          <span class="flex items-baseline justify-between"><span class="text-[17px] font-semibold">Итого</span><span class="text-[30px] font-extrabold">{rub(q.total)}</span></span>
          <span class="text-[15px] text-muted">или {sp(q.monthly)}&nbsp;₽/мес в рассрочку на {cat.installmentMonths} мес.</span>
          {q.savings > 0 && <span class="text-[15px] font-semibold text-sea">Ваша выгода {rub(q.savings)} по сравнению с покупкой по отдельности</span>}
        </div>

        <button type="button" class="btn btn-primary btn-lg btn-block" onClick={checkout}>Оформить пакет</button>
        <span class="text-center text-[13px] leading-snug text-muted">Дальше выберете способ оплаты: картой, частями или в рассрочку. {installmentNote}</span>
        <div class="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[15px]">
          <a href="#consult" class="link">Бесплатная консультация</a>
          <button type="button" onClick={copy} class="min-h-11 border-0 bg-transparent p-0 font-semibold text-sea">{copied ? 'Ссылка скопирована' : 'Скопировать ссылку на пакет'}</button>
        </div>
      </aside>
    </div>
  );
}
