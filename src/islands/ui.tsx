import type { ComponentChildren } from 'preact';

export const sp = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const rub = (n: number) => `${sp(n)} ₽`;

export function Check({ size = 16, class: cls = '' }: { size?: number; class?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class={cls}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function Cross({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

export function Gift({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect x="3" y="8" width="18" height="4" rx="1" /><path d="M12 8v13" /><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
    </svg>
  );
}

export function CheckBox({ on }: { on: boolean }) {
  return (
    <span class={`check-box ${on ? '!border-ink !bg-ink' : ''}`} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" style={{ opacity: on ? 1 : 0 }}>
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  );
}

export function scrollToId(id: string, focus = true) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
  if (focus) {
    const target = el.querySelector<HTMLElement>('h2, [tabindex="-1"]') ?? el;
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1');
    setTimeout(() => target.focus({ preventScroll: true }), reduce ? 0 : 450);
  }
}

/** Ручная навигация стрелками внутри radiogroup (roving tabindex) */
export function onRadioKeys(e: KeyboardEvent, ids: string[], current: string, pick: (id: string) => void) {
  const keys: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
  const target = e.currentTarget as HTMLElement;
  let i = ids.indexOf(target.dataset.value ?? current);
  if (e.key in keys) i = (i + keys[e.key] + ids.length) % ids.length;
  else if (e.key === 'Home') i = 0;
  else if (e.key === 'End') i = ids.length - 1;
  else return;
  e.preventDefault();
  pick(ids[i]);
  const group = target.closest('[role="radiogroup"]');
  group?.querySelector<HTMLElement>(`[data-value="${ids[i]}"]`)?.focus({ preventScroll: true });
}

export function Overline({ children }: { children: ComponentChildren }) {
  return <span class="t-overline">{children}</span>;
}
