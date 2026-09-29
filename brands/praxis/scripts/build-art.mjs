// Builds delivery images from cached Praxis sources.
//
//   public/art/graphics/<id>.webp   topsheet artwork strips at native resolution
//   public/art/veneers/<id>-l.webp  left and right halves of each veneer sheet, so a
//   public/art/veneers/<id>-r.webp  pair shows bookmatched grain rather than a copy
//   public/art/veneers/<id>.webp    swatch
//   public/art/stock/<model>.webp   cutouts of original product photos (details/ likewise)
//
// Cutouts only remove the white studio background and the white fringe on edge
// pixels; the skis themselves are not retouched.
import {mkdir, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import catalog from '../src/configurator/data/custom-catalog.json' with {type: 'json'};
import {detailCutouts, stockCovers} from '../src/catalog/covers.js';

const root = path.resolve(import.meta.dirname, '..');
const source = dir => path.join(root, 'art-source', dir);
const out = dir => path.join(root, 'public/art', dir);
const newer = async (output, input) => {
  try {
    return (await stat(output)).mtimeMs >= (await stat(input)).mtimeMs;
  } catch {
    return false;
  }
};
const kb = bytes => `${Math.round(bytes / 1024)} KB`;

async function graphics() {
  let total = 0;
  for (const graphic of [...catalog.graphics, ...catalog.signatureGraphics]) {
    const input = path.join(source('graphics'), `${graphic.id}.jpg`);
    const output = path.join(out('graphics'), `${graphic.id}.webp`);
    if (!(await newer(output, input))) await sharp(input).webp({quality: 88, effort: 5}).toFile(output);
    total += (await stat(output)).size;
  }
  return total;
}

async function veneers() {
  let total = 0;
  for (const veneer of catalog.veneers) {
    const input = path.join(source('veneers'), `${veneer.id}.jpg`);
    const {width, height} = await sharp(input).metadata();
    const half = Math.floor(width / 2);
    const outputs = [
      [`${veneer.id}-l.webp`, {left: 0, top: 0, width: half, height}],
      [`${veneer.id}-r.webp`, {left: width - half, top: 0, width: half, height}],
      [`${veneer.id}.webp`, null],
    ];
    for (const [name, region] of outputs) {
      const output = path.join(out('veneers'), name);
      if (!(await newer(output, input))) {
        let image = sharp(input);
        if (region) image = image.extract(region);
        await image.webp({quality: 90}).toFile(output);
      }
      total += (await stat(output)).size;
    }
  }
  return total;
}

// White-background removal by flood fill from the border. Neutral light greys
// (soft shadows) are background; warm light wood is not.
async function cutout(input, output, rotate = 0) {
  const {data, info} = await sharp(input).removeAlpha().raw().toBuffer({resolveWithObject: true});
  const {width, height} = info;
  const count = width * height;
  const min = new Uint8Array(count);
  const spread = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const r = data[i * 3];
    const g = data[i * 3 + 1];
    const b = data[i * 3 + 2];
    min[i] = Math.min(r, g, b);
    spread[i] = Math.max(r, g, b) - min[i];
  }
  const isBackground = i => (min[i] >= 236 && spread[i] <= 16) || (min[i] >= 206 && spread[i] <= 8);
  const background = new Uint8Array(count);
  const stack = [];
  const push = i => {
    if (!background[i] && isBackground(i)) {
      background[i] = 1;
      stack.push(i);
    }
  };
  for (let x = 0; x < width; x++) push(x), push((height - 1) * width + x);
  for (let y = 0; y < height; y++) push(y * width), push(y * width + width - 1);
  while (stack.length) {
    const i = stack.pop();
    const x = i % width;
    if (x > 0) push(i - 1);
    if (x < width - 1) push(i + 1);
    if (i >= width) push(i - width);
    if (i < count - width) push(i + width);
  }

  // Edge pixels next to the background blend with white; recover their alpha
  // and remove the white contribution so they sit cleanly on a dark stage.
  const rgba = Buffer.alloc(count * 4);
  let minX = width;
  let minY = height;
  let maxX = 0;
  let maxY = 0;
  for (let i = 0; i < count; i++) {
    const x = i % width;
    const y = (i / width) | 0;
    let alpha = 255;
    if (background[i]) alpha = 0;
    else {
      const nearBackground = (x > 0 && background[i - 1]) || (x < width - 1 && background[i + 1]) || (i >= width && background[i - width]) || (i < count - width && background[i + width]);
      if (nearBackground) alpha = Math.round(Math.min(1, Math.max(0.15, (255 - min[i]) / 70)) * 255);
    }
    const a = alpha / 255;
    for (let c = 0; c < 3; c++) {
      const value = data[i * 3 + c];
      rgba[i * 4 + c] = a > 0 && a < 1 ? Math.max(0, Math.min(255, Math.round((value - 255 * (1 - a)) / a))) : value;
    }
    rgba[i * 4 + 3] = alpha;
    if (alpha > 24) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const pad = 6;
  const left = Math.max(0, minX - pad);
  const top = Math.max(0, minY - pad);
  const cropped = await sharp(rgba, {raw: {width, height, channels: 4}})
    .extract({left, top, width: Math.min(width - 1, maxX + pad) - left + 1, height: Math.min(height - 1, maxY + pad) - top + 1})
    .png()
    .toBuffer();
  await sharp(cropped).rotate(rotate).webp({quality: 90, alphaQuality: 100, effort: 5}).toFile(output);
}

async function stock() {
  let total = 0;
  for (const [model, cover] of Object.entries(stockCovers)) {
    const input = path.join(source('photos'), cover.photo);
    const output = path.join(out('stock'), `${model}.webp`);
    if (!(await newer(output, input))) await cutout(input, output);
    total += (await stat(output)).size;
  }
  for (const [name, detail] of Object.entries(detailCutouts)) {
    const input = path.join(source('photos'), detail.photo);
    const output = path.join(out('details'), `${name}.webp`);
    if (!(await newer(output, input))) await cutout(input, output, detail.rotate);
    total += (await stat(output)).size;
  }
  return total;
}

for (const dir of ['graphics', 'veneers', 'stock', 'details']) await mkdir(out(dir), {recursive: true});
const sizes = {graphics: await graphics(), veneers: await veneers(), stock: await stock()};
console.log(Object.entries(sizes).map(([name, size]) => `${name} ${kb(size)}`).join(' · '));
console.log(`${(await readdir(out('graphics'))).length} graphics · ${(await readdir(out('veneers'))).length} veneer files · ${(await readdir(out('stock'))).length} stock cutouts`);
