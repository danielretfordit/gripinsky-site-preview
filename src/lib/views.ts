import { getCollection, getEntry } from 'astro:content';
import { getImage } from 'astro:assets';
import type { ProfessionView } from '../islands/ProfessionPicker';
import type { TariffView } from '../islands/FormatPicker';
import type { ProfId, TariffId } from './pricing';

/** Данные для островов: профессии с оптимизированными картинками */
export async function professionViews(): Promise<ProfessionView[]> {
  const profs = (await getCollection('professions')).sort((a, b) => a.data.order - b.data.order);
  return Promise.all(profs.map(async (p) => {
    const img = await getImage({ src: p.data.image, widths: [160, 480, 800], format: 'webp' });
    const courses = await Promise.all(p.data.courses.map(async (c) => {
      const course = (await getEntry('courses', c.course.id))!.data;
      return { id: c.course.id, name: course.title, price: course.price, meta: c.meta, description: c.description, final: c.final, blocks: c.blocks, href: course.legacyPath };
    }));
    return {
      id: p.id as ProfId, title: p.data.title, short: p.data.short, lead: p.data.lead, portfolio: p.data.portfolio, path: p.data.path,
      image: { src: img.src, srcset: img.srcSet.attribute, alt: p.data.imageAlt, fit: p.data.imageFit, pos: p.data.imagePos },
      courses,
    };
  }));
}

export async function tariffViews(): Promise<TariffView[]> {
  return (await getCollection('tariffs')).sort((a, b) => a.data.order - b.data.order)
    .map((t) => ({ id: t.id as TariffId, name: t.data.name, sub: t.data.sub, short: t.data.short, badge: t.data.badge, features: t.data.features }));
}

export async function professionTexts() {
  const profs = await getCollection('professions');
  const addonTexts: Record<string, string> = {};
  const giftTexts: Record<string, string> = {};
  for (const p of profs) {
    giftTexts[p.id] = p.data.gift.text;
    for (const a of p.data.addons) addonTexts[a.course.id] ??= a.text;
  }
  return { addonTexts, giftTexts };
}

/** FAQPage для поисковиков: только текст ответов, без разметки */
export async function faqLd(page: 'viz' | 'home') {
  const items = (await getCollection('faq', (f) => f.data.pages.includes(page))).sort((a, b) => a.data.order - b.data.order);
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.data.question,
      acceptedAnswer: { '@type': 'Answer', text: (f.body ?? '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim() },
    })),
  };
}
