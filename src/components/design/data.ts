// Данные для дизайн-прототипов /design/*: только реальные работы, цены и цифры из коллекций.
// Ничего не пишет и не меняет; используется только страницами src/pages/design (в dev).
import { getCollection, getEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { visibleWorks, personMap } from '../../lib/people';
import { getCatalog } from '../../lib/catalog';
import { quote, basePrice, baseSeparately } from '../../lib/pricing';
import { sp } from '../../lib/format';

export interface ProtoWork {
  id: string;
  image: ImageMetadata;
  before?: ImageMetadata | null;
  alt: string;
  title: string;
  author: string;
  award: string | null;
  focus: string;
}

const AWARD: Record<string, string> = { 'tsar-gory': '«Царь горы» на 3DDD', 'render-dnya': '«Рендер дня»', '3ddd-award': '3DDD Award' };

export async function protoData() {
  const site = (await getEntry('settings', 'site'))!.data;
  const people = await personMap();
  const works = await visibleWorks();
  const byId = new Map(works.map((w) => [w.id, w]));
  const work = (id: string): ProtoWork | null => {
    const w = byId.get(id);
    if (!w) return null; // нет согласия или работы: просто не показываем
    const title = w.data.title.replace(/,?\s*«(Рендер дня|Царь горы)»/g, '').trim();
    return {
      id,
      image: w.data.image,
      before: w.data.beforeImage,
      alt: w.data.alt,
      title: title.startsWith('«') ? title : title.charAt(0).toLowerCase() + title.slice(1),
      author: people.get(w.data.author.id)?.name ?? '',
      award: w.data.awards[0] ? AWARD[w.data.awards[0]] : null,
      focus: w.data.focus ?? '50% 50%',
    };
  };
  const pick = (ids: string[]) => ids.map(work).filter(Boolean) as ProtoWork[];

  const cat = await getCatalog();
  const tariffRows = (await getCollection('tariffs')).sort((a, b) => a.data.order - b.data.order).map((t) => ({
    id: t.id,
    name: t.data.name,
    sub: t.data.sub,
    short: t.data.short,
    badge: t.data.badge ?? null,
    features: t.data.features,
    price: basePrice(cat, t.id as 'lite' | 'opt' | 'mentor'),
  }));
  // Пример пакета для статичного макета: база в «Оптимальном» + Интерьеры PRO
  const pkg = quote(cat, { base: true, prof: 'int', addons: [], tariff: 'opt' });
  const prof = cat.professions;
  const profMin = Math.min(...Object.values(prof).flatMap((p) => p.courses.map((c) => c.price)));
  const pkgMin = cat.base.price + profMin;

  const galleryCount = works.filter((w) => w.data.inGallery).length;
  const kings = (await getCollection('awards', (a) => a.data.kind === 'student' && people.has(a.data.person.id))).length;
  const reviews = (await getCollection('reviews')).sort((a, b) => a.data.order - b.data.order).map((r) => r.data);

  const m = cat.installmentMonths;
  return {
    site,
    stats: site.stats,
    cat,
    work,
    pick,
    tariffs: tariffRows,
    pkg,
    pkgLines: {
      base: cat.base.name,
      prof: prof.int.courses[0].name,
      gift: prof.int.gift.name,
      giftValue: prof.int.gift.value,
    },
    prices: {
      base: cat.base.price,
      baseMonthly: Math.ceil(cat.base.price / m),
      separately: baseSeparately(cat, 'chat'),
      profMin,
      pkgMin,
      months: m,
    },
    galleryCount,
    kings,
    reviews,
    rub: (n: number) => `${sp(n)} ₽`,
    sp,
  };
}

export type ProtoData = Awaited<ReturnType<typeof protoData>>;

export const VARIANTS = [
  {
    id: 'a',
    letter: 'A',
    name: 'Аккуратная эволюция',
    idea: 'Текущая система, приведённая в порядок: один ритм отступов, одна сетка карточек, меньше лайма и плашек.',
    for: 'Если нравится нынешний сайт и нужно быстро и без риска сделать его аккуратнее.',
  },
  {
    id: 'b',
    letter: 'B',
    name: 'Галерея',
    idea: 'Работы учеников на весь экран как главный герой. Крупная типографика, тонкие линии вместо рамок, много воздуха.',
    for: 'Если главное впечатление «здесь учат делать такие картинки» и сайт должен выглядеть как портфолио.',
  },
  {
    id: 'c',
    letter: 'C',
    name: 'Продуктовый',
    idea: 'Сетка из 12 колонок, крупные цифры и цены, путь «База, Профессия, Пакет» как понятная навигация из трёх шагов.',
    for: 'Если главное быстро объяснить, что купить и сколько это стоит, и довести до оплаты.',
  },
] as const;
