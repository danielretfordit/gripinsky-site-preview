// Расчёт пакета «база + профессия + допы + формат».
// Чистые функции без зависимостей: одни и те же для острова в браузере и для /api/checkout на сервере.

export type TariffId = 'lite' | 'opt' | 'mentor';
export type ProfId = 'int' | 'ext' | 'stock';

export interface CatalogCourse { id: string; name: string; price: number | null }
export interface Catalog {
  base: {
    id: string;
    name: string;
    price: number;
    /** Сумма реальных цен курсов базы по отдельности (честный якорь) */
    separately: number;
    included: { id: string; name: string; value: number | null }[];
    gifts: { id: string; name: string; value: number | null }[];
  };
  tariffs: { id: TariffId; name: string; extra: number }[];
  professions: Record<ProfId, {
    title: string;
    courses: (CatalogCourse & { price: number; default: boolean })[];
    gift: { id: string; name: string; value: number | null };
    addons: CatalogCourse[];
  }>;
  installmentMonths: number;
}

export interface Selection {
  base: boolean;
  prof: ProfId;
  /** Явный выбор курсов профессии (если у профессии их несколько) */
  courses?: Record<string, boolean>;
  addons: string[];
  tariff: TariffId;
}

export type LineKind = 'item' | 'gift' | 'included' | 'format';
export interface Line { id: string; kind: LineKind; name: string; price: number; value?: number | null; note?: string }

export interface Quote {
  lines: Line[];
  total: number;
  monthly: number;
  savings: number;
  /** Доплата за формат применяется только вместе с базой */
  tariffApplied: boolean;
  /** Идентификаторы всего, что уходит в заказ (курсы, подарки, формат) */
  items: string[];
}

export function activeCourseIds(cat: Catalog, sel: Pick<Selection, 'prof' | 'courses'>): string[] {
  const p = cat.professions[sel.prof];
  const on = p.courses.filter((c) => sel.courses?.[c.id] ?? c.default).map((c) => c.id);
  return on.length ? on : [p.courses[0].id];
}

export function availableAddons(cat: Catalog, sel: Pick<Selection, 'prof' | 'base'>): CatalogCourse[] {
  const included = new Set(sel.base ? cat.base.included.map((i) => i.id) : []);
  return cat.professions[sel.prof].addons.filter((a) => a.price != null && !included.has(a.id));
}

export function basePrice(cat: Catalog, tariff: TariffId): number {
  return cat.base.price + (cat.tariffs.find((t) => t.id === tariff)?.extra ?? 0);
}

export function quote(cat: Catalog, sel: Selection): Quote {
  const p = cat.professions[sel.prof];
  const lines: Line[] = [];
  const items: string[] = [];
  let total = 0;
  let savings = 0;

  if (sel.base) {
    lines.push({ id: cat.base.id, kind: 'item', name: cat.base.name, price: cat.base.price });
    items.push(cat.base.id);
    total += cat.base.price;
    savings += Math.max(0, cat.base.separately - cat.base.price);
    for (const inc of cat.base.included) {
      lines.push({ id: inc.id, kind: 'included', name: inc.name, price: 0, value: inc.value });
      savings += inc.value ?? 0;
    }
    for (const g of cat.base.gifts) {
      lines.push({ id: g.id, kind: 'gift', name: g.name, price: 0, value: g.value });
      items.push(g.id);
      savings += g.value ?? 0;
    }
  }

  const active = new Set(activeCourseIds(cat, sel));
  for (const c of p.courses) {
    if (!active.has(c.id)) continue;
    lines.push({ id: c.id, kind: 'item', name: c.name, price: c.price });
    items.push(c.id);
    total += c.price;
  }

  lines.push({ id: p.gift.id, kind: 'gift', name: p.gift.name, price: 0, value: p.gift.value });
  items.push(p.gift.id);
  savings += p.gift.value ?? 0;

  const allowed = new Map(availableAddons(cat, sel).map((a) => [a.id, a]));
  for (const id of sel.addons) {
    const a = allowed.get(id);
    if (!a || a.price == null) continue;
    lines.push({ id: a.id, kind: 'item', name: a.name, price: a.price });
    items.push(a.id);
    total += a.price;
  }

  const t = cat.tariffs.find((x) => x.id === sel.tariff) ?? cat.tariffs[0];
  const tariffApplied = sel.base;
  if (tariffApplied) {
    lines.push({ id: `tariff:${t.id}`, kind: 'format', name: `Формат: ${t.name}`, price: t.extra });
    items.push(`tariff:${t.id}`);
    total += t.extra;
  }

  return { lines, total, monthly: Math.ceil(total / cat.installmentMonths), savings, tariffApplied, items };
}

// ---------- Тест «С чего начать» ----------

export type QuizAnswers = [number, number, ProfId | 'unsure', TariffId];

export interface QuizResult {
  level: 'Новичок' | 'Есть пробелы' | 'Уверенный уровень';
  why: string;
  base: boolean;
  prof: ProfId;
  unsure: boolean;
  tariff: TariffId;
  courses: Record<string, boolean>;
}

export function quizResult(cat: Catalog, a: QuizAnswers): QuizResult {
  const skill = a[0] + a[1];
  const unsure = a[2] === 'unsure';
  const prof: ProfId = unsure ? 'int' : (a[2] as ProfId);
  // Тест рекомендует все курсы профессии (для экстерьеров это и «Масштабные ЖК»)
  const courses = Object.fromEntries(cat.professions[prof].courses.map((c) => [c.id, true]));
  const level = skill <= 1 ? 'Новичок' : skill <= 3 ? 'Есть пробелы' : 'Уверенный уровень';
  const why = {
    'Новичок': 'Начните с базы: она даст моделирование, свет, материалы и рендер. Без неё курсы профессии будут слишком сложными.',
    'Есть пробелы': 'Вы уже что-то умеете, но база закроет пробелы в топологии, свете и материалах. Именно от них зависит качество рендера.',
    'Уверенный уровень': 'Базу можно пропустить и сразу перейти к профессии и курсам PRO.',
  }[level];
  return { level, why, base: skill <= 3, prof, unsure, tariff: a[3], courses };
}

/** Только база с выбранным форматом (кнопка «Купить только базу») */
export function quoteBaseOnly(cat: Catalog, tariff: TariffId): Quote {
  const t = cat.tariffs.find((x) => x.id === tariff) ?? cat.tariffs[0];
  const lines: Line[] = [
    { id: cat.base.id, kind: 'item', name: cat.base.name, price: cat.base.price },
    ...cat.base.included.map((i) => ({ id: i.id, kind: 'included' as const, name: i.name, price: 0, value: i.value })),
    ...cat.base.gifts.map((g) => ({ id: g.id, kind: 'gift' as const, name: g.name, price: 0, value: g.value })),
    { id: `tariff:${t.id}`, kind: 'format', name: `Формат: ${t.name}`, price: t.extra },
  ];
  const total = cat.base.price + t.extra;
  const savings = Math.max(0, cat.base.separately - cat.base.price)
    + cat.base.included.reduce((s, i) => s + (i.value ?? 0), 0)
    + cat.base.gifts.reduce((s, g) => s + (g.value ?? 0), 0);
  return {
    lines, total, monthly: Math.ceil(total / cat.installmentMonths), savings, tariffApplied: true,
    items: [cat.base.id, ...cat.base.gifts.map((g) => g.id), `tariff:${t.id}`],
  };
}

/** Короткое описание пакета для заявки и CRM */
export function summarize(q: Quote): string {
  return q.lines.filter((l) => l.kind !== 'included').map((l) => l.name).join(' + ') + `; итого ${q.total} ₽`;
}

/** Отдельный курс или пакет из каталога */
export function quoteCourse(course: { id: string; name: string; price: number }, months: number): Quote {
  return {
    lines: [{ id: course.id, kind: 'item', name: course.name, price: course.price }],
    total: course.price,
    monthly: Math.ceil(course.price / months),
    savings: 0,
    tariffApplied: false,
    items: [course.id],
  };
}
