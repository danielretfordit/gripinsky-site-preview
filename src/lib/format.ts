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
