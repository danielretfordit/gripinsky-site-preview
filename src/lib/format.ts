/** 29900 -> «29 900» (неразрывный узкий пробел не используем: обычный пробел, как в макетах) */
export const sp = (n: number): string => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
export const rub = (n: number): string => `${sp(n)} ₽`;
export const perMonth = (n: number, months: number): string => `${sp(Math.ceil(n / months))} ₽/мес`;

/** Склонение: plural(3, ['модель', 'модели', 'моделей']) */
export function plural(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

/**
 * Типографика для заголовков и подписей: «3D-визуализатор» не рвётся на дефисе (неразрывный дефис U+2011),
 * число и единица не расходятся по строкам. Данные не меняются, только вывод.
 */
export const typo = (s: string): string => s
  .replace(/\b([23]D)-(?=[А-Яа-яЁёA-Za-z])/g, '$1‑')
  .replace(/(\d) (₽|%|мес|ч|мин)(?=$|[\s.,)])/g, '$1 $2');

/** Первая буква строчная, если слово не аббревиатура («ТЗ», «ЖК» сохраняются) */
export const lcFirst = (s: string): string => {
  const first = s.split(/\s/)[0] ?? '';
  if (first.length > 1 && first === first.toUpperCase()) return s;
  return s.charAt(0).toLowerCase() + s.slice(1);
};
