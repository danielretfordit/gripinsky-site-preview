import { atom } from 'nanostores';
import type { Catalog, SetInput, Support, TariffId } from '../lib/pricing';

export const CART_KEY = 'gripinsky-cart-v1';
export const $cart = atom<SetInput>({ ids: [], support: 'chat' });
export const $cartOpen = atom(false);
let initialized = false;

export function normalizeCart(cat: Catalog, value: unknown): SetInput {
  const v = value as Partial<SetInput> | null;
  const support: Support = v?.support === 'self' ? 'self' : 'chat';
  const ids = Array.isArray(v?.ids) ? [...new Set(v.ids.filter((id): id is string => typeof id === 'string' && (id === cat.base.id || Object.hasOwn(cat.courses, id))))].slice(0, 100) : [];
  const tariff = v?.tariff && ['lite', 'opt', 'mentor'].includes(v.tariff) ? v.tariff : undefined;
  return { ids, support, ...(tariff ? { tariff: support === 'self' ? 'lite' : tariff === 'lite' ? 'opt' : tariff } : {}) };
}

/**
 * Корзина из ссылки: ?cart=modeling1,ai&support=chat&tariff=opt. Нужна, когда человек открывает сайт из Telegram или VK
 * и переходит в обычный браузер: у встроенного браузера своё хранилище, и выбор иначе потерялся бы.
 * Идентификаторы проверяются по каталогу (normalizeCart), лишнее отбрасывается.
 */
function cartFromUrl(cat: Catalog): SetInput | null {
  try {
    const q = new URLSearchParams(location.search);
    const raw = q.get('cart');
    if (!raw) return null;
    const value = normalizeCart(cat, { ids: raw.split(',').slice(0, 100), support: q.get('support') ?? undefined, tariff: q.get('tariff') ?? undefined });
    // Параметры убираем из адресной строки, чтобы ссылка при обновлении не добавляла курсы повторно
    for (const k of ['cart', 'support', 'tariff']) q.delete(k);
    const rest = q.toString();
    history.replaceState(history.state, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`);
    return value.ids.length ? value : null;
  } catch { return null; }
}

/** Ссылка на текущую корзину (для «открыть в браузере» и «отправить подборку себе») */
export function cartShareUrl(cart: SetInput, path = '/courses'): string {
  const q = new URLSearchParams({ cart: cart.ids.join(','), support: cart.support, ...(cart.tariff ? { tariff: cart.tariff } : {}) });
  return `${location.origin}${path}?${q}`;
}

export function initializeCart(cat: Catalog) {
  if (initialized) return;
  initialized = true;
  const fromUrl = cartFromUrl(cat);
  try {
    const saved = normalizeCart(cat, JSON.parse(localStorage.getItem(CART_KEY) ?? 'null'));
    const pending = $cart.get();
    const merged = [...saved.ids, ...pending.ids, ...(fromUrl?.ids ?? [])];
    const base = fromUrl ?? (pending.ids.length ? pending : saved);
    $cart.set(normalizeCart(cat, { ...base, ids: merged }));
  } catch { $cart.set(normalizeCart(cat, fromUrl ?? $cart.get())); }
}

export function addCourses(ids: string[], format?: { support: Support; tariff?: TariffId }) {
  const current = $cart.get();
  $cart.set({ ...current, ...format, ids: [...new Set([...current.ids, ...ids])] });
  $cartOpen.set(true);
}
export function removeCourse(id: string) {
  $cart.set({ ...$cart.get(), ids: $cart.get().ids.filter((x) => x !== id) });
}
export function setCartSupport(support: Support) {
  $cart.set({ ...$cart.get(), support, tariff: support === 'self' ? 'lite' : 'opt' });
}
