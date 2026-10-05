// Контактный лист картинок папки: node docs/design/scripts/contact.mjs <dir> <out.png>
import sharp from 'sharp';
import { readdirSync } from 'node:fs';
const [dir, out] = process.argv.slice(2);
const files = readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort();
const T = 260, H = 200, cols = 6, pad = 8, lab = 22;
const tiles = [];
for (const [i, f] of files.entries()) {
  const m = await sharp(`${dir}/${f}`).metadata();
  const img = await sharp(`${dir}/${f}`).resize(T, H, { fit: 'cover' }).toBuffer();
  const svg = Buffer.from(`<svg width="${T}" height="${lab}"><rect width="100%" height="100%" fill="#000"/><text x="4" y="15" font-size="12" font-family="Arial" fill="#fff">${f.replace(/\.\w+$/, '')} ${m.width}x${m.height}</text></svg>`);
  const x = (i % cols) * (T + pad), y = Math.floor(i / cols) * (H + lab + pad);
  tiles.push({ input: img, left: x, top: y }, { input: svg, left: x, top: y + H });
}
const rows = Math.ceil(files.length / cols);
await sharp({ create: { width: cols * (T + pad), height: rows * (H + lab + pad), channels: 3, background: '#333' } }).composite(tiles).png().toFile(out);
console.log(files.length);
