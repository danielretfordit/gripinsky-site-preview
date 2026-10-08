import { getCollection, getEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';

export interface PersonView { id: string; name: string; photo?: ImageMetadata | null; consent: 'yes' | 'pending' | 'no' }

/**
 * Люди, которых можно показывать на сайте.
 * «no» не показываем никогда; «pending» показываем, пока в настройках выключено requireConsent (пилот).
 */
export async function personMap(): Promise<Map<string, PersonView>> {
  const site = (await getEntry('settings', 'site'))!.data;
  const people = await getCollection('people');
  return new Map(
    people
      .filter((p) => p.data.consent !== 'no' && (!site.publish.requireConsent || p.data.consent === 'yes'))
      .map((p) => [p.id, { id: p.id, name: p.data.name, photo: p.data.photo, consent: p.data.consent }]),
  );
}

export async function visibleWorks() {
  const people = await personMap();
  return (await getCollection('works', (w) => people.has(w.data.author.id) && !w.data.isProcessImage)).sort((a, b) => a.data.order - b.data.order);
}
