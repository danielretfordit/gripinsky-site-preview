// Нарезка полностраничных скриншотов в «контактные листы» для просмотра.
// node docs/design/scripts/sheets.mjs <png> <outPrefix> [colHeight] [cols] [scale]
import sharp from 'sharp';
const [src, out, colH = '2000', colsArg = '4', scaleArg = '1'] = process.argv.slice(2);
const meta = await sharp(src).metadata();
const W = meta.width, H = meta.height, ch = +colH, cols = +colsArg, scale = +scaleArg;
const n = Math.ceil(H / ch);
const gap = 24;
let sheet = 0;
for (let i = 0; i < n; i += cols) {
  const parts = [];
  for (let j = 0; j < cols && i + j < n; j++) {
    const top = (i + j) * ch;
    const h = Math.min(ch, H - top);
    const buf = await sharp(src).extract({ left: 0, top, width: W, height: h }).toBuffer();
    parts.push({ input: buf, left: j * (W + gap), top: 0 });
  }
  const width = parts.length * W + (parts.length - 1) * gap;
  let img = sharp({ create: { width, height: ch, channels: 3, background: '#ff00ff' } }).composite(parts).png();
  const buf = await img.toBuffer();
  await sharp(buf).resize(Math.round(width * scale)).png().toFile(`${out}-${++sheet}.png`);
}
console.log(out, sheet, 'sheets');
