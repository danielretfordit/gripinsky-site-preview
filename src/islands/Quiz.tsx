import { useState, useRef, useEffect } from 'preact/hooks';
import { useStore } from '@nanostores/preact';
import { $pkg, $quiz, $quizOpen } from '../stores/package';
import { quizResult, quote, type Catalog, type QuizAnswers, type ProfId, type TariffId } from '../lib/pricing';
import { reachGoal } from '../lib/analytics';
import { rub, sp, Check, scrollToId } from './ui';

type Variant = 'viz' | 'home';
interface Props { cat: Catalog; variant?: Variant; telegramBot: string; gamesHref: string; vizHref: string; startOpen?: boolean }

type Q = { q: string; o: [string, number | string][] };
const DIRECTION: Q = { q: 'Что вам интереснее создавать?', o: [['Интерьеры, дома и предметы', 'viz'], ['Игровые миры: предметы, локации, персонажей', 'games'], ['Пока не знаю', 'viz?']] };
const QS: Q[] = [
  { q: 'Вы уже работали в 3ds Max?', o: [['Никогда', 0], ['Немного, по урокам или на других курсах', 1], ['Да, уверенно моделирую', 2]] },
  { q: 'Умеете делать рендер в Corona или V-Ray?', o: [['Нет', 0], ['Простые сцены, но не фотореализм', 1], ['Да, делаю фотореалистичные рендеры', 2]] },
  { q: 'Кем хотите работать?', o: [['Визуализатором интерьеров', 'int'], ['Визуализатором экстерьеров и ЖК', 'ext'], ['3D-моделлером для стоков', 'stock'], ['Пока не знаю', 'unsure']] },
  { q: 'Как хотите учиться?', o: [['Сам, в своём темпе', 'lite'], ['С проверкой работ и поддержкой кураторов', 'opt'], ['С личным наставником', 'mentor']] },
];
const TN: Record<TariffId, string> = { lite: 'Самостоятельный', opt: 'Оптимальный', mentor: 'Наставничество' };
const TD: Record<TariffId, string> = { lite: 'все уроки, доступ на год', opt: 'проверка работ и поддержка кураторов 6 месяцев', mentor: 'личный наставник и разборы ваших работ' };

export default function Quiz({ cat, variant = 'viz', telegramBot, gamesHref, vizHref, startOpen = false }: Props) {
  const open = useStore($quizOpen) || startOpen;
  const [dir, setDir] = useState<string | null>(variant === 'home' ? null : 'viz');
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const qRef = useRef<HTMLHeadingElement>(null);
  const resRef = useRef<HTMLDivElement>(null);

  const total = (variant === 'home' ? 1 : 0) + QS.length;
  const answered = (variant === 'home' && dir !== null ? 1 : 0) + answers.length;
  const games = dir === 'games';
  const done = games || answers.length === QS.length;
  const cur = variant === 'home' && dir === null ? DIRECTION : QS[answers.length];

  // Фокус переносим только после действий посетителя. На главной тест открыт сразу,
  // и перенос фокуса при загрузке уводил клавиатуру и экранный диктор в середину страницы
  const touched = useRef(false);
  const wasOpen = useRef(open);
  useEffect(() => {
    // Тест открыли кнопкой «Пройти тест» или ссылкой в первом экране: это тоже действие посетителя
    if (open && !wasOpen.current) touched.current = true;
    wasOpen.current = open;
    if (!open || !touched.current) return;
    (done ? resRef.current : qRef.current)?.focus({ preventScroll: true });
  }, [answers.length, dir, open, done]);

  const pick = (v: number | string) => {
    touched.current = true;
    if (answered === 0) reachGoal('test_start', { variant });
    if (variant === 'home' && dir === null) { setDir(String(v)); if (v === 'games') reachGoal('test_complete', { result: 'games' }); return; }
    const next = [...answers, v];
    setAnswers(next);
    if (next.length === QS.length) reachGoal('test_complete', { variant, prof: String(next[2]), tariff: String(next[3]) });
  };
  const back = () => {
    touched.current = true;
    if (answers.length) setAnswers(answers.slice(0, -1));
    else if (variant === 'home') setDir(null);
  };
  const reset = () => { touched.current = true; setAnswers([]); setDir(variant === 'home' ? null : 'viz'); };

  if (!open) {
    if (variant === 'home') {
      return (
        <div class="flex flex-col items-start gap-4">
          <button type="button" class="btn btn-primary btn-lg" onClick={() => $quizOpen.set(true)}>Подобрать курс за 1 минуту</button>
          <span class="t-small text-muted">5 вопросов, без звонка менеджера</span>
        </div>
      );
    }
    return (
      <div class="grid gap-4 md:grid-cols-2">
        <div class="flex flex-col gap-3 border-t border-line pt-6">
          <span class="t-overline">Вы у нас впервые</span>
          <span class="t-title text-[24px]">Не знаете, с чего начать?</span>
          <span class="text-ink-2">Тест за 1 минуту: подберём курсы и сразу покажем цену пакета.</span>
          <button type="button" class="btn btn-primary btn-lg mt-1 self-start" onClick={() => $quizOpen.set(true)}>Пройти тест</button>
        </div>
        <div class="flex flex-col gap-3 border-t border-line pt-6">
          <span class="t-overline">Уже знаете 3ds Max и Corona</span>
          <span class="t-title text-[24px]">Сразу к профессии</span>
          <span class="text-ink-2">Пропустите базу и выберите профессию и курсы PRO.</span>
          <button type="button" class="btn btn-secondary btn-lg mt-1 self-start"
            onClick={() => { $pkg.setKey('base', false); scrollToId('profession'); }}>Выбрать профессию ↓</button>
        </div>
      </div>
    );
  }

  let result: ReturnType<typeof quizResult> | null = null;
  let price = 0, monthly = 0;
  if (done && !games) {
    const a = answers as unknown as QuizAnswers;
    result = quizResult(cat, a);
    const q = quote(cat, { base: result.base, prof: result.prof, courses: result.courses, addons: [], tariff: result.tariff });
    price = q.total; monthly = q.monthly;
  }

  /** toPackage = false: ссылка сама ведёт к консультации, пакет только применяем, без прокрутки и переноса фокуса */
  const apply = (toPackage = true) => {
    if (!result) return;
    $pkg.set({ base: result.base, prof: result.prof, courses: result.courses, addons: [], tariff: result.tariff });
    $quiz.set(result);
    try { sessionStorage.setItem('gr-quiz-summary', `${result.level}; ${cat.professions[result.prof].title}${result.unsure ? ' (не уверен)' : ''}; ${TN[result.tariff]}`); } catch {}
    reachGoal('test_apply', { prof: result.prof, base: result.base, tariff: result.tariff });
    // «Подобрать со специалистом»: подборка уйдёт в заявку, ссылка сама ведёт к форме на этой же странице
    if (!toPackage) return;
    if (variant === 'home') {
      const q = new URLSearchParams({ prof: result.prof, tariff: result.tariff });
      if (!result.base) q.set('base', '0');
      const c = Object.entries(result.courses).filter(([, v]) => v).map(([k]) => k);
      if (c.length) q.set('c', c.join(','));
      location.href = `${vizHref}?${q.toString()}#package`;
      return;
    }
    scrollToId('package');
  };
  const tgStart = result ? `quiz_${result.prof}_${result.base ? 'b' : 'n'}_${result.tariff}` : 'quiz';

  return (
    <div class="grid gap-8 border-t border-line pt-8 md:grid-cols-[5fr_7fr] md:gap-12 md:pt-10">
      <div class="flex flex-col gap-3">
        <span class="t-overline t-signal">Тест на 1 минуту</span>
        <h2 class="t-h2">Подберём ваш старт</h2>
        <p class="m-0 text-ink-2">Ответьте на {total} {total >= 5 ? 'вопросов' : 'вопроса'}, и мы определим ваш уровень, подскажем курсы и сразу посчитаем пакет.</p>
        <div class="mt-2 flex gap-1.5" role="progressbar" aria-label="Прогресс теста" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done ? total : answered}>
          {Array.from({ length: total }, (_, k) => (
            <span class={`h-1.5 flex-1 rounded ${k < (done ? total : answered) ? 'bg-lime' : 'bg-[rgb(236_236_230/0.18)]'}`} />
          ))}
        </div>
      </div>

      <div class="flex min-h-[340px] flex-col gap-4" aria-live="polite">
        {!done && (
          <>
            <span class="text-[15px] text-muted">Вопрос {answered + 1} из {total}</span>
            <h3 ref={qRef} tabIndex={-1} class="t-h3 outline-none">{cur.q}</h3>
            <div class="flex flex-col gap-2.5">
              {cur.o.map(([t, v]) => (
                <button type="button" key={t} onClick={() => pick(v)}
                  class="choice min-h-14 px-5 py-3 text-left text-[17px] font-semibold">{t}</button>
              ))}
            </div>
            {answered > 0 && (
              <button type="button" onClick={back} class="min-h-11 self-start border-0 bg-transparent px-0 text-[15px] font-semibold text-muted">Назад</button>
            )}
          </>
        )}

        {done && games && (
          <div ref={resRef} tabIndex={-1} class="flex flex-col gap-4 outline-none">
            <span class="t-overline">Ваше направление</span>
            <span class="text-[30px] font-extrabold text-ink">3D для игр</span>
            <span class="text-ink-2">Предметы, локации и персонажи в Blender, ZBrush и Unreal Engine. Направление пока живёт на прежнем сайте академии.</span>
            <div class="flex flex-wrap items-center gap-3">
              <a href={gamesHref} class="btn btn-primary btn-lg">Смотреть курсы для игр</a>
              <a href="#consult" class="link">Бесплатная консультация</a>
              <button type="button" onClick={reset} class="min-h-11 border-0 bg-transparent text-[15px] font-semibold text-muted">Пройти заново</button>
            </div>
          </div>
        )}

        {done && result && (
          <div ref={resRef} tabIndex={-1} class="flex flex-col gap-4 outline-none">
            <span class="t-overline">Ваш уровень</span>
            <span class="text-[30px] font-extrabold leading-tight text-ink">{result.level}</span>
            <span class="text-ink-2">{result.why}</span>
            <div class="flex flex-col gap-2.5 rounded-card border border-line p-5">
              <span class="t-overline">Рекомендуем</span>
              {result.base && <Row t="База 3D-визуализатора" d="3ds Max, Corona и ИИ в 3D" />}
              {cat.professions[result.prof].courses.map((c) => (
                <Row key={c.id} t={c.name} d={result!.unsure ? 'самая популярная профессия, уточним на консультации' : 'курс выбранной профессии'} />
              ))}
              {result.base && <Row t={`Формат «${TN[result.tariff]}»`} d={TD[result.tariff]} />}
              <div class="mt-1 flex flex-wrap items-baseline justify-between gap-2 border-t border-line pt-3">
                <span class="font-semibold">Пакет целиком</span>
                <span class="text-right"><b class="text-[22px]">{rub(price)}</b><span class="block text-[14px] text-muted">или {sp(monthly)}&nbsp;₽/мес в рассрочку</span></span>
              </div>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              {result.unsure ? (
                <>
                  <a href="#consult" class="btn btn-primary btn-lg" onClick={() => apply(false)}>Подобрать со специалистом</a>
                  <button type="button" class="btn btn-secondary btn-lg" onClick={() => apply()}>Показать пакет ↓</button>
                </>
              ) : (
                <button type="button" class="btn btn-primary btn-lg" onClick={() => apply()}>Показать пакет и цену ↓</button>
              )}
              <a href={`${telegramBot}?start=${tgStart}`} class="link" onClick={() => reachGoal('tg_click', { place: 'quiz' })}>Сохранить подборку в Telegram</a>
              <button type="button" onClick={reset} class="min-h-11 border-0 bg-transparent text-[15px] font-semibold text-muted">Пройти заново</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ t, d }: { t: string; d: string }) {
  return (
    <span class="flex gap-2.5 leading-snug">
      <Check size={18} class="mt-0.5 shrink-0 text-ink" />
      <span><b>{t}:</b> <span class="text-muted">{d}</span></span>
    </span>
  );
}

export type { ProfId };
