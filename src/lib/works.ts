import { getCollection } from 'astro:content';
import type { ImageMetadata } from 'astro';
import { visibleWorks, personMap } from './people';

const AWARD: Record<string, string> = { 'tsar-gory': '«Царь горы» на 3DDD', 'render-dnya': '«Рендер дня»', '3ddd-award': '3DDD Award' };

export interface WorkView {
  id: string;
  image: ImageMetadata;
  alt: string;
  /** Название без наград, с маленькой буквы (кроме названий в кавычках) */
  title: string;
  author: string;
  award: string | null;
  /** object-position для обрезки */
  focus: string;
  soft: string | null;
}

/** Работы для витрин: только люди с согласием на публикацию; нет работы, нет и плитки */
export async function workViews() {
  const people = await personMap();
  const works = await visibleWorks();
  const byId = new Map(works.map((w) => [w.id, w]));
  const work = (id: string): WorkView | null => {
    const w = byId.get(id);
    if (!w) return null;
    const title = w.data.title.replace(/,?\s*«(Рендер дня|Царь горы)»/g, '').trim();
    return {
      id,
      image: w.data.image,
      alt: w.data.alt,
      title: title.startsWith('«') ? title : title.charAt(0).toLowerCase() + title.slice(1),
      author: people.get(w.data.author.id)?.name ?? '',
      award: w.data.awards[0] ? AWARD[w.data.awards[0]] : null,
      focus: w.data.focus ?? '50% 50%',
      soft: w.data.categories.includes('model') ? null : '3ds Max + Corona',
    };
  };
  const pick = (ids: string[]) => ids.map(work).filter(Boolean) as WorkView[];
  const galleryCount = works.filter((w) => w.data.inGallery).length;
  const kings = (await getCollection('awards', (a) => a.data.kind === 'student' && people.has(a.data.person.id))).length;
  return { work, pick, galleryCount, kings };
}

/** Подпись под работой: «Автор, название. Награда» */
export const workCaption = (w: WorkView) => `${w.author}, ${w.title}${w.award ? `. ${w.award}` : ''}`;
