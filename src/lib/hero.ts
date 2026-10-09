import { getCollection } from 'astro:content';
import { workViews, type WorkView } from './works';
import { isLive } from './schedule';

/** Слайд первого экрана: работа ученика и настройки из админки («Слайды первого экрана») */
export type HeroSlide = WorkView & { label?: string; mobileFocus?: string | null; captionOverride?: string | null };

/** Слайды страницы по порядку; работы без согласия на публикацию и истёкшие слайды отбрасываются */
export async function heroSlides(page: 'home' | 'viz' | 'games'): Promise<HeroSlide[]> {
  const wv = await workViews();
  const entries = (await getCollection('heroSlides', (e) => e.data.pages.includes(page) && isLive(e.data)))
    .sort((a, b) => a.data.order - b.data.order);
  return entries.flatMap((e) => {
    const w = wv.work(e.data.work.id);
    return w ? [{ ...w, label: e.data.label, mobileFocus: e.data.mobileFocus, captionOverride: e.data.caption }] : [];
  });
}
