import type { APIRoute, GetStaticPaths, ImageMetadata } from 'astro';
import { getCollection } from 'astro:content';
import { renderOg, type OgFit } from '../../lib/og';
import { visibleWorks } from '../../lib/people';
// По умолчанию обложка курса: модель на фирменном фоне (у героя главной жёлтый фон, а лайм в бренде только для акцентов)
import fallback from '../../assets/courses/interiorpro.png';
import aiScene from '../../assets/ai/mesh-scene.jpg';

// Картинки превью для соцсетей: /og/default.jpg, /og/course-<id>.jpg, /og/prof-<id>.jpg, /og/story-<id>.jpg …
export const getStaticPaths = (async () => {
  const works = new Map((await visibleWorks()).map((w) => [w.id, w]));
  const item = (key: string, image: ImageMetadata, fit: OgFit = 'cover') => ({ params: { key }, props: { image, fit } });
  const courses = (await getCollection('courses')).filter((c) => c.data.cover).map((c) => item(`course-${c.id}`, c.data.cover!));
  const profs = (await getCollection('professions')).map((p) => item(`prof-${p.id}`, p.data.image, p.data.imageFit));
  const stories = (await getCollection('stories'))
    .map((s) => ({ s, w: [...s.data.works, ...s.data.extraWorks].map((r) => works.get(r.id)).find(Boolean) }))
    .filter((x) => x.w)
    .map(({ s, w }) => item(`story-${s.id}`, w!.data.image));
  const posts = (await getCollection('blog', (p) => !p.data.draft && Boolean(p.data.cover))).map((p) => item(`post-${p.id}`, p.data.cover!));
  const galleryCover = [...works.values()].find((w) => w.data.inGallery && w.data.categories.includes('int'));
  return [
    item('default', fallback),
    item('ai', aiScene),
    ...(galleryCover ? [item('gallery', galleryCover.data.image)] : []),
    ...courses,
    ...profs,
    ...stories,
    ...posts,
  ];
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const { image, fit } = props as { image: ImageMetadata; fit: OgFit };
  return new Response(new Uint8Array(await renderOg(image, fit)), { headers: { 'content-type': 'image/jpeg' } });
};
