// Даты показа баннеров, акций и слайдов. Границы по Москве: с 00:00 дня start до 23:59 дня end.
// На статическом сайте проверка идёт при сборке (сайт пересобирается каждую ночь) и ещё раз в браузере
// по атрибутам data-start / data-end (src/components/ScheduleGuard.astro), чтобы истёкшее скрывалось сразу.

const MSK_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface Window { start?: Date | null; end?: Date | null; active?: boolean }

/** Начало дня по Москве (дата из админки приходит как полночь UTC) */
export const startOfDayMsk = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - MSK_OFFSET_MS);
/** Конец дня по Москве */
export const endOfDayMsk = (d: Date) => new Date(startOfDayMsk(d).getTime() + DAY_MS - 1);

export function isLive(w: Window, now = new Date()): boolean {
  if (w.active === false) return false;
  if (w.start && now < startOfDayMsk(w.start)) return false;
  if (w.end && now > endOfDayMsk(w.end)) return false;
  return true;
}

/** Атрибуты для проверки в браузере: истёкший или ещё не начавшийся элемент скрывается без пересборки */
export function scheduleAttrs(w: Window): Record<string, string> {
  return {
    ...(w.start ? { 'data-start': String(startOfDayMsk(w.start).getTime()) } : {}),
    ...(w.end ? { 'data-end': String(endOfDayMsk(w.end).getTime()) } : {}),
  };
}

/** Дата окончания для подписи «до 31 октября» (без таймеров обратного отсчёта) */
export const untilLabel = (end: Date) => `до ${end.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`;
