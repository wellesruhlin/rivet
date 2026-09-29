// Board outline and artwork crops from Proteus's product images.
//
// Every product image is the same 800 × 1200 mockup: the topsheet on the left and the
// base on the right, on one grey background. Pixels that change between designs are the
// boards; the background, shadows and the marks printed on every board (binding inserts,
// the adjustment cap, the base wordmark) do not. The per-pixel variation across all 222
// images therefore gives the exact board silhouette. From it:
//   src/brand/data/outline.json   the traced planform (width per row) and mockup landmarks
//   public/art/top|base/<name>.webp   each colorway's topsheet and base, cropped to the
//                                     board and bled 2 px past the edge (no grey fringe)
//   public/art/thumb/<name>.webp  gallery tiles (top and base side by side)
import {mkdir, readdir, writeFile} from 'node:fs/promises';
import {existsSync, statSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const source = `${root}art-source/images/boards/`;
const W = 800, H = 1200, N = W * H;
const THRESHOLD = 12;

const files = (await readdir(source)).filter(f => f.endsWith('.png')).sort();
const pixels = file => sharp(`${source}${file}`).flatten({background: '#e5e5e5'}).removeAlpha().raw().toBuffer();

// 1. Variation across designs.
const sum = new Float64Array(N * 3), sum2 = new Float64Array(N * 3);
for (const file of files) {
  const data = await pixels(file);
  for (let i = 0; i < N * 3; i++) {sum[i] += data[i]; sum2[i] += data[i] * data[i];}
}
const sd = new Float32Array(N);
for (let p = 0; p < N; p++) {
  let s = 0;
  for (let c = 0; c < 3; c++) {const m = sum[p * 3 + c] / files.length; s += Math.max(0, sum2[p * 3 + c] / files.length - m * m);}
  sd[p] = Math.sqrt(s / 3);
}

// 2. Silhouettes: per row, the first and last varying pixel in each half (sub-pixel by
//    interpolating the threshold crossing).
function trace(x0, x1) {
  const rows = [];
  for (let y = 0; y < H; y++) {
    const at = x => sd[y * W + x];
    let a = -1, b = -1;
    for (let x = x0; x < x1; x++) if (at(x) > THRESHOLD) {if (a < 0) a = x; b = x;}
    if (a < 0 || b - a < 3) continue;
    const left = a - (at(a) - THRESHOLD) / Math.max(1e-6, at(a) - at(a - 1));
    const right = b + (at(b) - THRESHOLD) / Math.max(1e-6, at(b) - at(b + 1));
    rows.push([y, left, right]);
  }
  return rows;
}
const top = trace(0, 400), base = trace(400, 800);
const box = rows => ({x0: Math.floor(Math.min(...rows.map(r => r[1]))), x1: Math.ceil(Math.max(...rows.map(r => r[2]))), y0: rows[0][0], y1: rows.at(-1)[0]});
const topBox = box(top), baseBox = box(base);

// Landmarks printed on every topsheet (low variation inside the board): the insert dots and
// the adjustment cap, as fractions of the board's length and width.
const inside = (x, y) => {const r = top.find(row => row[0] === y); return r && x > r[1] + 3 && x < r[2] - 3;};
const marks = [];
for (let y = topBox.y0; y <= topBox.y1; y++) for (let x = topBox.x0; x <= topBox.x1; x++) if (inside(x, y) && sd[y * W + x] < THRESHOLD * .6) marks.push([x, y]);
const lengthPx = topBox.y1 - topBox.y0, widest = Math.max(...top.map(r => r[2] - r[1]));
const centerX = (topBox.x0 + topBox.x1) / 2;
const outline = {
  note: 'Traced from the shared Proteus product mockup (800 × 1200). v runs 0 at the nose to 1 at the tail; widths are fractions of the widest point.',
  lengthPx,
  widestPx: widest,
  aspect: widest / lengthPx,
  profile: top.map(([y, l, r]) => [+((y - topBox.y0) / lengthPx).toFixed(4), +((r - l) / widest).toFixed(4)]),
  printedMarks: {
    note: 'Pixels inside the topsheet that are the same on every design: insert dots and the adjustment cap outline.',
    extentV: marks.length ? [+((Math.min(...marks.map(m => m[1])) - topBox.y0) / lengthPx).toFixed(4), +((Math.max(...marks.map(m => m[1])) - topBox.y0) / lengthPx).toFixed(4)] : null,
    count: marks.length,
    centerX: +(((marks.reduce((s, m) => s + m[0], 0) / Math.max(1, marks.length)) - centerX) / widest).toFixed(4),
  },
  crops: {top: topBox, base: baseBox},
};
await mkdir(`${root}src/brand/data`, {recursive: true});
await writeFile(`${root}src/brand/data/outline.json`, `${JSON.stringify(outline)}\n`);

// 3. Crops with a 2 px bleed past the traced edge.
const rowsByY = rows => new Map(rows.map(r => [r[0], r]));
const topRows = rowsByY(top), baseRows = rowsByY(base);
async function crop(data, bbox, rows) {
  const w = bbox.x1 - bbox.x0 + 1, h = bbox.y1 - bbox.y0 + 1, out = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) {
    const row = rows.get(bbox.y0 + y) ?? rows.get(bbox.y0 + y - 1) ?? rows.get(bbox.y0 + y + 1);
    const l = Math.ceil(row[1]) + 2, r = Math.floor(row[2]) - 2;
    for (let x = 0; x < w; x++) {
      const sx = Math.max(l, Math.min(r, bbox.x0 + x));
      const si = ((bbox.y0 + y) * W + sx) * 3, di = (y * w + x) * 3;
      out[di] = data[si]; out[di + 1] = data[si + 1]; out[di + 2] = data[si + 2];
    }
  }
  return sharp(out, {raw: {width: w, height: h, channels: 3}});
}
for (const dir of ['top', 'base', 'thumb']) await mkdir(`${root}public/art/${dir}`, {recursive: true});
let built = 0;
for (const file of files) {
  const name = file.replace(/\.png$/, '');
  const target = `${root}public/art/top/${name}.webp`;
  if (existsSync(target) && statSync(target).mtimeMs > statSync(`${source}${file}`).mtimeMs) continue;
  const data = await pixels(file);
  await (await crop(data, topBox, topRows)).webp({quality: 92}).toFile(target);
  await (await crop(data, baseBox, baseRows)).webp({quality: 92}).toFile(`${root}public/art/base/${name}.webp`);
  await sharp(`${source}${file}`).flatten({background: '#e5e5e5'}).extract({left: topBox.x0 - 12, top: topBox.y0 - 12, width: baseBox.x1 - topBox.x0 + 24, height: topBox.y1 - topBox.y0 + 24}).resize({height: 360}).webp({quality: 82}).toFile(`${root}public/art/thumb/${name}.webp`);
  built++;
}
console.log(`Outline: ${top.length} rows, ${lengthPx} px long, aspect ${outline.aspect.toFixed(4)}; ${marks.length} printed-mark pixels. ${built} of ${files.length} colorways cropped.`);
