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

export function initializeCart(cat: Catalog) {
  if (initialized) return;
  initialized = true;
  try {
    const saved = normalizeCart(cat, JSON.parse(localStorage.getItem(CART_KEY) ?? 'null'));
    const pending = $cart.get();
    $cart.set(pending.ids.length ? normalizeCart(cat, { ...pending, ids: [...saved.ids, ...pending.ids] }) : saved);
  } catch { $cart.set(normalizeCart(cat, $cart.get())); }
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
