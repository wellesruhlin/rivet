// The Proteus base template and topsheet hardware, recovered from the product art.
//
// Every Proteus base uses one template: a nose band, a logo block carrying the trident
// symbol, and the body carrying the PROTEUS wordmark; only the three colors change. The
// symbol is drawn in the body color and the wordmark in the block color. Every topsheet
// also shows the same hardware: two groups of binding inserts and the outline of the
// adjustment port. From the cropped art (npm run art):
//   src/brand/data/template.json        band boundaries and mark boxes (fractions of the board box)
//   public/art/template/symbol.png      the base symbol as a white alpha mask
//   public/art/template/wordmark.png    the base wordmark as a white alpha mask
//   public/art/template/hardware.png    inserts and port outline as a dark alpha mask
//   public/assets/mark.png              the trident from Proteus's logo, white on transparent
import {mkdir, readdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const art = `${root}public/art/`;
const UPSCALE = 3;

const load = async file => {
  const {data, info} = await sharp(file).removeAlpha().raw().toBuffer({resolveWithObject: true});
  return {data, width: info.width, height: info.height};
};
const px = (img, x, y) => {const i = (y * img.width + x) * 3; return [img.data[i], img.data[i + 1], img.data[i + 2]];};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const median = values => {const s = [...values].sort((a, b) => a - b); return s[Math.floor(s.length / 2)];};
const medianColor = colors => [0, 1, 2].map(c => median(colors.map(k => k[c])));

const bases = (await readdir(`${art}base`)).filter(f => f.endsWith('.webp') && !/^\d{3}-/.test(f)).sort();
const images = await Promise.all(bases.map(f => load(`${art}base/${f}`)));
const {width: W, height: H} = images[0];

// Inside the board, a few pixels in from the traced edge (the mockup shades the rails and
// the crop box shows background beside the tapered nose and tail).
const outline = JSON.parse(await (await import('node:fs/promises')).readFile(`${root}src/brand/data/outline.json`, 'utf8'));
const widthAt = v => {
  const rows = outline.profile;
  let i = 0;
  while (i < rows.length - 2 && rows[i + 1][0] < v) i++;
  const [v0, w0] = rows[i], [v1, w1] = rows[i + 1];
  return w0 + (w1 - w0) * Math.max(0, Math.min(1, (v - v0) / Math.max(1e-6, v1 - v0)));
};
const interior = (x, y, inset = 4) => Math.abs(x + .5 - W / 2) < widthAt(y / (H - 1)) * W / 2 - inset;

// 1. Bands: the rows where the central column's color jumps, agreed across designs.
// Sampled beside the marks (the symbol and wordmark sit in the middle of the board).
const rowColor = (img, y) => medianColor(Array.from({length: Math.round(W * .08)}, (_, k) => px(img, Math.round(W * .08) + k, y)));
const jumps = new Float64Array(H);
for (const img of images) {
  let previous = rowColor(img, 0);
  for (let y = 1; y < H; y++) {
    const color = rowColor(img, y);
    if (dist(color, previous) > 40) jumps[y] += 1;
    previous = color;
  }
}
const peak = (from, to) => {let best = from; for (let y = from; y < to; y++) if (jumps[y] > jumps[best]) best = y; return best;};
const band1 = peak(Math.round(H * .08), Math.round(H * .22));
const band2 = peak(Math.round(H * .25), Math.round(H * .42));
console.log('bands', band1 / H, band2 / H, 'agreement', jumps[band1], jumps[band2], 'of', images.length);

// 2. Masks: in each zone, how far each pixel moves from the zone color toward the other
//    zone's color, averaged over designs whose two colors contrast strongly.
function zoneMask(y0, y1, inkZone) {
  const w = W, h = y1 - y0;
  const sum = new Float64Array(w * h);
  let used = 0;
  for (const img of images) {
    const zone = medianColor(Array.from({length: 200}, (_, k) => px(img, 3 + (k * 7) % (W - 6), y0 + 2 + Math.floor(k * (h - 4) / 200))));
    const ink = medianColor(Array.from({length: 200}, (_, k) => px(img, 3 + (k * 7) % (W - 6), inkZone[0] + 2 + Math.floor(k * (inkZone[1] - inkZone[0] - 4) / 200))));
    const span = dist(zone, ink);
    if (span < 90) continue;
    const d = [ink[0] - zone[0], ink[1] - zone[1], ink[2] - zone[2]];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (!interior(x, y0 + y)) continue;
      const p = px(img, x, y0 + y);
      const t = ((p[0] - zone[0]) * d[0] + (p[1] - zone[1]) * d[1] + (p[2] - zone[2]) * d[2]) / (span * span);
      sum[y * w + x] += Math.max(0, Math.min(1, t));
    }
    used++;
  }
  const mask = Float64Array.from(sum, v => v / Math.max(1, used));
  // Trim to the mark, with a small margin.
  let x0 = w, x1 = 0, yy0 = h, yy1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (mask[y * w + x] > .35) {x0 = Math.min(x0, x); x1 = Math.max(x1, x); yy0 = Math.min(yy0, y); yy1 = Math.max(yy1, y);}
  const m = 4;
  x0 = Math.max(0, x0 - m); x1 = Math.min(w - 1, x1 + m); yy0 = Math.max(0, yy0 - m); yy1 = Math.min(h - 1, yy1 + m);
  return {mask, w, used, box: {x0, x1, y0: y0 + yy0, y1: y0 + yy1}, local: {x0, x1, y0: yy0, y1: yy1}};
}
async function writeMask(zone, file, color = [255, 255, 255]) {
  const {mask, w, local} = zone;
  const cw = local.x1 - local.x0 + 1, ch = local.y1 - local.y0 + 1;
  const rgba = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const v = mask[(local.y0 + y) * w + local.x0 + x];
    // A gentle curve sharpens the soft, resampled edges without stair-stepping them.
    const a = Math.max(0, Math.min(1, (v - .18) / .64));
    const i = (y * cw + x) * 4;
    rgba.set([...color, Math.round(255 * a * a * (3 - 2 * a))], i);
  }
  await sharp(rgba, {raw: {width: cw, height: ch, channels: 4}})
    .resize({width: cw * UPSCALE, height: ch * UPSCALE, kernel: 'lanczos3'})
    .png({compressionLevel: 9})
    .toFile(file);
}
const block = [band1, band2], body = [band2, H];
const symbol = zoneMask(block[0], block[1], [body[0] + 4, Math.min(H, body[0] + 40)]);
const wordmark = zoneMask(body[0], body[1], block);
console.log('symbol from', symbol.used, 'designs; wordmark from', wordmark.used);

// 3. Topsheet hardware, from the one topsheet that leaves the middle of the board bare
//    (Machina, Arctic Orange): the two insert groups, the port outline and its window.
const lum = p => .2126 * p[0] + .7152 * p[1] + .0722 * p[2];
const plain = await load(`${art}top/machina--arctic-orange.webp`);
// Between the two insert groups and no further: Machina’s own graphic starts below .75.
const region = [Math.round(H * .2), Math.round(H * .745)];
const hardware = new Float64Array(W * H);
for (let y = region[0]; y < region[1]; y++) for (let x = 0; x < W; x++) {
  if (interior(x, y, 8)) hardware[y * W + x] = Math.max(0, Math.min(1, (228 - lum(px(plain, x, y))) / 190));
}
console.log('hardware from machina--arctic-orange');
const hw = {mask: hardware, w: W, local: {x0: 0, x1: W - 1, y0: 0, y1: H - 1}};

await mkdir(`${art}template`, {recursive: true});
await writeMask(symbol, `${art}template/symbol.png`);
await writeMask(wordmark, `${art}template/wordmark.png`);
await writeMask(hw, `${art}template/hardware.png`, [18, 19, 22]);

const fraction = box => ({x: +(box.x0 / W).toFixed(4), y: +(box.y0 / H).toFixed(4), width: +((box.x1 - box.x0 + 1) / W).toFixed(4), height: +((box.y1 - box.y0 + 1) / H).toFixed(4)});
const template = {
  note: 'Fractions of the board’s bounding box (x across, y from the nose). Recovered from Proteus’s product art by scripts/build-template.mjs.',
  bands: [+(band1 / H).toFixed(4), +(band2 / H).toFixed(4)],
  symbol: fraction(symbol.box),
  wordmark: fraction(wordmark.box),
};
await writeFile(`${root}src/brand/data/template.json`, `${JSON.stringify(template, null, 2)}\n`);

// 4. The trident from Proteus's logo (the white shape inside the navy square).
const logo = await sharp(`${root}art-source/images/proteus-logo-dark@2x.png`).removeAlpha().raw().toBuffer({resolveWithObject: true});
const side = logo.info.height, square = Buffer.alloc(side * side * 4);
for (let y = 0; y < side; y++) for (let x = 0; x < side; x++) {
  const i = (y * logo.info.width + x) * 3;
  const white = Math.max(0, Math.min(1, (lum([logo.data[i], logo.data[i + 1], logo.data[i + 2]]) - 70) / 170));
  square.set([255, 255, 255, Math.round(255 * white)], (y * side + x) * 4);
}
await mkdir(`${root}public/assets`, {recursive: true});
await sharp(square, {raw: {width: side, height: side, channels: 4}}).trim({threshold: 1}).png({compressionLevel: 9}).toFile(`${root}public/assets/mark.png`);
console.log(template);
