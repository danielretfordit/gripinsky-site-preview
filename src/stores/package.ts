import { sitePath } from '../lib/deployment';
import { map, atom } from 'nanostores';
import type { SetInput, Selection, ProfId, TariffId, QuizResult } from '../lib/pricing';

const PROFS: ProfId[] = ['int', 'ext', 'stock'];
const TARIFFS: TariffId[] = ['lite', 'opt', 'mentor'];

/** Текущий пакет на странице направления (общий для всех островов) */
export const $pkg = map<Selection>({ base: true, prof: 'int', courses: {}, addons: [], tariff: 'opt' });

/** Результат теста, если посетитель его прошёл и применил */
export const $quiz = atom<QuizResult | null>(null);

/** Открыт ли тест (кнопки «Пройти тест» в первом экране и на развилке) */
export const $quizOpen = atom(false);

export type CheckoutRequest = { kind: 'set'; selection: SetInput } | { kind: 'package' } | { kind: 'base'; tariff: TariffId } | { kind: 'course'; id: string; name: string; price: number };
/**
 * Запрос на оформление («Оформить пакет», «Купить курс»). Атом, а не событие:
 * если нажать кнопку раньше, чем загрузится остров с диалогом, запрос дождётся его и не потеряется.
 */
export const $checkout = atom<CheckoutRequest | null>(null);
export const openCheckout = (req: CheckoutRequest) => $checkout.set(req);

/** Читает пакет из адреса: /courses-page/visualization?prof=ext&base=0&tariff=lite&c=residential_complex&a=materialspro */
export function initFromUrl() {
  if (typeof window === 'undefined') return;
  const q = new URLSearchParams(location.search);
  const prof = q.get('prof') as ProfId | null;
  const tariff = q.get('tariff') as TariffId | null;
  const patch: Partial<Selection> = {};
  if (prof && PROFS.includes(prof)) patch.prof = prof;
  if (tariff && TARIFFS.includes(tariff)) patch.tariff = tariff;
  if (q.get('base') === '0') patch.base = false;
  const c = q.get('c');
  if (c) patch.courses = Object.fromEntries(c.split(',').map((id) => [id, true]));
  const a = q.get('a');
  if (a) patch.addons = a.split(',');
  if (Object.keys(patch).length) $pkg.set({ ...$pkg.get(), ...patch });
}

/**
 * Запускает fn, когда все острова client:load на странице гидратированы.
 * Пакет из адреса нельзя применять раньше: остров, который гидратируется позже,
 * получит уже изменённое состояние, его разметка разойдётся с серверной, и Preact соберёт DOM с ошибками.
 */
export function afterIslandsHydrated(fn: () => void) {
  const pending = () => document.querySelector('astro-island[ssr][client="load"]');
  if (!pending()) { fn(); return; }
  const mo = new MutationObserver(() => {
    if (pending()) return;
    mo.disconnect();
    fn();
  });
  mo.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['ssr'] });
}

/** Ссылка на собранный пакет (чтобы отправить себе или вернуться позже) */
export function packageUrl(sel: Selection): string {
  const q = new URLSearchParams();
  q.set('prof', sel.prof);
  q.set('tariff', sel.tariff);
  if (!sel.base) q.set('base', '0');
  const c = Object.entries(sel.courses ?? {}).filter(([, v]) => v).map(([k]) => k);
  if (c.length) q.set('c', c.join(','));
  if (sel.addons.length) q.set('a', sel.addons.join(','));
  return `${location.origin}${sitePath('/courses-page/visualization')}?${q.toString()}#profession`;
}
