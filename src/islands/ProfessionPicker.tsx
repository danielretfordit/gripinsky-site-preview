import { useStore } from '@nanostores/preact';
import { $pkg } from '../stores/package';
import { activeCourseIds, type Catalog, type ProfId } from '../lib/pricing';
import { reachGoal } from '../lib/analytics';
import { rub, Check, CheckBox, onRadioKeys } from './ui';

export interface ProfessionView {
  id: ProfId;
  title: string;
  short: string;
  lead: string;
  portfolio: string;
  path: string;
  image: { src: string; srcset?: string; alt: string; fit: 'cover' | 'contain'; pos: string };
  courses: { id: string; name: string; price: number; meta: string; description: string; final: string; blocks: string[]; href: string }[];
}
interface Props { cat: Catalog; professions: ProfessionView[] }

export default function ProfessionPicker({ cat, professions }: Props) {
  const pkg = useStore($pkg);
  const ids = professions.map((p) => p.id);
  const cur = professions.find((p) => p.id === pkg.prof) ?? professions[0];
  const active = new Set(activeCourseIds(cat, pkg));
  const pick = (id: ProfId) => { $pkg.setKey('prof', id); reachGoal('prof_select', { id }); };
  const toggleCourse = (id: string) => {
    const on = active.has(id);
    if (on && active.size === 1) return;
    $pkg.setKey('courses', { ...(pkg.courses ?? {}), ...Object.fromEntries([...active].map((c) => [c, true])), [id]: !on });
  };

  return (
    <div class="flex flex-col gap-8">
      <label class="flex cursor-pointer items-start gap-3 rounded-2xl border border-line p-4 text-ink-2 sm:items-center">
        <input type="checkbox" class="sr-only" checked={!pkg.base} onChange={() => $pkg.setKey('base', !pkg.base)} />
        <CheckBox on={!pkg.base} />
        <span><b class="text-ink">Уже знаю 3ds Max и Corona.</b> Базу пропускаю, выбираю только профессию.</span>
      </label>
      {!pkg.base && (
        <p class="-mt-4 m-0 rounded-2xl bg-sea-08 px-4 py-3 text-[15px] text-ink-2">
          Без базы курсы PRO будут сложными, если вы ещё не уверенно моделируете и не делаете рендер в Corona. Сомневаетесь? <a href="#quiz" class="link">Пройдите тест</a>.
        </p>
      )}

      <div role="radiogroup" aria-label="Профессия" class="grid gap-3 md:grid-cols-3 md:gap-4">
        {professions.map((p) => {
          const on = p.id === cur.id;
          return (
            <button type="button" role="radio" aria-checked={on} tabIndex={on ? 0 : -1} data-value={p.id} key={p.id}
              onClick={() => pick(p.id)} onKeyDown={(e) => onRadioKeys(e, ids, cur.id, (id) => pick(id as ProfId))}
              class="choice zoom group relative grid grid-cols-[72px_1fr] items-center gap-4 overflow-hidden p-2 text-left md:block md:h-[250px] md:p-0">
              <img src={p.image.src} srcset={p.image.srcset} sizes="(min-width: 1024px) 400px, 72px" alt="" loading="lazy" decoding="async"
                class="h-[72px] w-[72px] rounded-xl bg-white md:absolute md:inset-0 md:h-full md:w-full md:rounded-none"
                style={{ objectFit: p.image.fit, objectPosition: p.image.pos, opacity: on ? 1 : 0.85 }} />
              <span class="hidden md:absolute md:inset-0 md:block md:bg-[linear-gradient(180deg,rgba(13,32,35,0)_30%,rgba(13,32,35,0.92))]" />
              <span class={`absolute right-3 top-3 hidden items-center gap-1 rounded-full px-2.5 py-1 text-[13px] font-semibold md:inline-flex ${on ? 'bg-lime text-bg' : 'bg-[rgb(231_231_231/0.85)] text-bg'}`}>
                {on ? <><Check size={12} /> выбрано</> : 'выбрать'}
              </span>
              <span class="flex flex-col gap-0.5 md:absolute md:bottom-3.5 md:left-[18px] md:right-[18px]">
                <span class="text-[17px] font-extrabold uppercase md:text-[19px]">{p.title}</span>
                <span class="text-[14px] text-ink-2 md:text-[15px]">{p.short}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div class="grid gap-8 md:grid-cols-[4fr_8fr] md:gap-12">
        <div class="flex flex-col gap-4">
          <p class="m-0 text-[19px] leading-normal">{cur.lead}</p>
          <span class="text-[15px] text-muted">В портфолио: <b class="text-ink">{cur.portfolio}</b></span>
          <a href={cur.path} class="link text-[15px]">Подробнее о профессии →</a>
        </div>
        <div class={`grid gap-6 ${cur.courses.length > 1 ? 'md:grid-cols-2' : ''}`}>
          {cur.courses.map((c) => {
            const on = active.has(c.id);
            const multi = cur.courses.length > 1;
            return (
              <div key={c.id} class={`flex flex-col gap-2 border-l-[3px] py-2 pl-5 ${on ? 'border-sea' : 'border-line'}`} style={{ opacity: on ? 1 : 0.7 }}>
                {multi && (
                  <label class="mb-1 inline-flex min-h-11 cursor-pointer items-center gap-2.5 self-start text-[15px] font-semibold">
                    <input type="checkbox" class="sr-only" checked={on} disabled={on && active.size === 1} onChange={() => toggleCourse(c.id)} />
                    <CheckBox on={on} />
                    {on ? 'В пакете' : `Добавить в пакет, +${rub(c.price)}`}
                  </label>
                )}
                <div class="flex items-baseline justify-between gap-4">
                  <span class="text-[19px] font-extrabold">{c.name}</span>
                  <span class="whitespace-nowrap text-[19px] font-extrabold">{rub(c.price)}</span>
                </div>
                <span class="text-[15px] leading-normal text-ink-2">{c.description}</span>
                <span class="text-[15px]"><b class="text-sea">Итог:</b> {c.final}</span>
                <details>
                  <summary class="inline-flex min-h-11 items-center text-[15px] font-semibold text-lime">Программа: {c.meta} <span class="details-arrow ml-1.5">↓</span></summary>
                  <ol class="m-0 mt-1 grid gap-1.5 pl-5 text-[15px] text-ink-2">
                    {c.blocks.map((b) => <li key={b}>{b}</li>)}
                  </ol>
                  <a href={c.href} class="link mt-2 inline-block text-[15px]">Страница курса →</a>
                </details>
                {multi && on && active.size === 1 && <span class="text-[13px] text-muted">Хотя бы один курс профессии остаётся в пакете</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
