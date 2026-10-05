import sharp from 'sharp';
import type { ImageMetadata } from 'astro';
import logoImg from '../assets/brand/logo.png';
import { OG_W, OG_H } from './seo';

// Картинки для превью ссылок в Telegram, VK и поиске: 1200×630, фирменный фон, логотип и работа.
// Собираются при сборке в /og/<key>.jpg (src/pages/og/[key].jpg.ts).

const BG = '#0D2023';
const LIME = '#F8F61A';

/** cover: снимок во всю ширину; contain: картинка на светлом фоне карточкой справа */
export type OgFit = 'cover' | 'contain';

const srcPath = (img: ImageMetadata) => {
  const p = (img as ImageMetadata & { fsPath?: string }).fsPath;
  if (!p) throw new Error(`og: нет пути к файлу картинки ${img.src}`);
  return p;
};

async function logoLayer(left: number) {
  const width = 340;
  const logo = await sharp(srcPath(logoImg)).resize({ width }).png().toBuffer();
  const h = Math.round((width * logoImg.height) / logoImg.width);
  const top = Math.round(OG_H / 2 - h / 2 - 8);
  const bar = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="6"><rect width="64" height="6" rx="3" fill="${LIME}"/></svg>`);
  return [
    { input: logo, left, top },
    { input: bar, left, top: top + h + 22 },
  ];
}

export async function renderOg(img: ImageMetadata, fit: OgFit = 'cover'): Promise<Buffer> {
  const file = srcPath(img);
  const { hasAlpha } = await sharp(file).metadata();
  const canvas = sharp({ create: { width: OG_W, height: OG_H, channels: 3, background: BG } });

  if (hasAlpha) {
    // Обложки курсов: модель на прозрачном фоне ставим справа
    const size = 600;
    const model = await sharp(file).resize(size, size, { fit: 'inside' }).png().toBuffer();
    return canvas.composite([{ input: model, left: OG_W - size - 40, top: Math.round((OG_H - size) / 2) }, ...(await logoLayer(72))]).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }

  if (fit === 'contain') {
    // Предмет на белом фоне: карточка со скруглёнными углами справа
    const w = 560, h = 520, r = 24;
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${r}"/></svg>`);
    const card = await sharp(file).resize(w, h, { fit: 'contain', background: '#ffffff' }).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
    return canvas.composite([{ input: card, left: OG_W - w - 56, top: Math.round((OG_H - h) / 2) }, ...(await logoLayer(72))]).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  }

  // Рендер во всю ширину, слева затемнение под логотип
  const photo = await sharp(file).resize(OG_W, OG_H, { fit: 'cover', position: 'attention' }).toBuffer();
  const shade = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0">` +
      `<stop offset="0" stop-color="${BG}" stop-opacity="0.92"/><stop offset="0.38" stop-color="${BG}" stop-opacity="0.7"/><stop offset="0.7" stop-color="${BG}" stop-opacity="0"/>` +
      `</linearGradient></defs><rect width="${OG_W}" height="${OG_H}" fill="url(#g)"/></svg>`,
  );
  return sharp(photo).composite([{ input: shade, left: 0, top: 0 }, ...(await logoLayer(72))]).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}
