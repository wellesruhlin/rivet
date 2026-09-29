// Traces each model's ski outline from Praxis's published shape drawings.
//
//   art-source/shapes/<model>.jpg         pair drawings from the custom product pages
//   src/configurator/data/outlines.json   {model: {aspect, profile, profileRight?}}
//
// A profile lists both edges as [v, x]: v runs 0 (tip) → 1 (tail) and x runs
// 0 → 1 across the ski's widest point. A pair whose skis differ by more than
// ASYMMETRY (as a share of width) keeps both outlines; one-pixel drawing noise does not.
import {readdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(import.meta.dirname, '..');
const shapesDir = path.join(root, 'art-source/shapes');
const output = path.join(root, 'src/configurator/data/outlines.json');
// The Slugger drawing shares its image with a spec table on the right.
const CROP = {slugger: {right: 0.5}};
const SAMPLES = 56;
const DARK = 228;
const ASYMMETRY = 0.08;

async function load(file, crop) {
  const image = sharp(file).flatten({background: '#ffffff'}).greyscale();
  const {width, height} = await image.metadata();
  const w = crop?.right ? Math.round(width * crop.right) : width;
  const {data} = await image.extract({left: 0, top: 0, width: w, height}).raw().toBuffer({resolveWithObject: true});
  return {data, width: w, height};
}

// Everything the white background cannot reach from the border is a ski.
function skiMask({data, width, height}) {
  const background = new Uint8Array(width * height);
  const stack = [];
  const push = i => {
    if (!background[i] && data[i] >= DARK) {
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
    if (i < width * (height - 1)) push(i + width);
  }
  return background.map(b => 1 - b);
}

function components(mask, width, height) {
  const label = new Int32Array(width * height);
  const parts = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || label[start]) continue;
    const part = {id: parts.length + 1, area: 0, minX: width, maxX: 0, minY: height, maxY: 0};
    const stack = [start];
    label[start] = part.id;
    while (stack.length) {
      const i = stack.pop();
      const x = i % width;
      const y = (i / width) | 0;
      part.area++;
      part.minX = Math.min(part.minX, x);
      part.maxX = Math.max(part.maxX, x);
      part.minY = Math.min(part.minY, y);
      part.maxY = Math.max(part.maxY, y);
      for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
        if (j >= 0 && j < mask.length && mask[j] && !label[j]) {
          label[j] = part.id;
          stack.push(j);
        }
      }
    }
    parts.push(part);
  }
  return {label, parts};
}

const round = n => Math.round(n * 1000) / 1000;

function profile(label, width, part) {
  const rows = [];
  for (let y = part.minY; y <= part.maxY; y++) {
    let left = -1;
    let right = -1;
    for (let x = part.minX; x <= part.maxX; x++) {
      if (label[y * width + x] !== part.id) continue;
      if (left < 0) left = x;
      right = x;
    }
    rows.push(left < 0 ? null : [left, right]);
  }
  const span = part.maxX - part.minX + 1;
  const length = part.maxY - part.minY;
  const edges = {left: [], right: []};
  for (let i = 0; i < SAMPLES; i++) {
    const v = (1 - Math.cos((Math.PI * i) / (SAMPLES - 1))) / 2;
    let row = rows[Math.round(v * length)];
    for (let d = 1; !row && d < 6; d++) row = rows[Math.round(v * length) + d] ?? rows[Math.round(v * length) - d];
    if (!row) continue;
    // Pixel edges sit half a pixel outside the stroke centers.
    const [l, r] = row;
    edges.left.push([round(v), round((l - part.minX) / span)]);
    edges.right.push([round(v), round((r + 1 - part.minX) / span)]);
  }
  return {aspect: round(span / (length + 1)), profile: edges};
}

const mirror = p => ({left: p.right.map(([v, x]) => [v, round(1 - x)]), right: p.left.map(([v, x]) => [v, round(1 - x)])});
const difference = (a, b) => Math.max(...a.left.map(([, x], i) => Math.abs(x - (b.left[i]?.[1] ?? x))), ...a.right.map(([, x], i) => Math.abs(x - (b.right[i]?.[1] ?? x))));

const outlines = {};
for (const file of (await readdir(shapesDir)).filter(f => f.endsWith('.jpg')).sort()) {
  const model = file.replace('.jpg', '');
  const image = await load(path.join(shapesDir, file), CROP[model]);
  const mask = skiMask(image);
  const {label, parts} = components(mask, image.width, image.height);
  const skis = parts.sort((a, b) => b.area - a.area).slice(0, 2).sort((a, b) => a.minX - b.minX);
  if (skis.length < 2) throw new Error(`${model}: expected a pair, found ${skis.length} shape(s)`);
  const [left, right] = skis.map(part => profile(label, image.width, part));
  const offset = difference(left.profile, mirror(right.profile));
  const asymmetric = offset > ASYMMETRY;
  if (process.env.TRACE_DEBUG === model) {
    const m = mirror(right.profile);
    for (let i = 0; i < left.profile.left.length; i += 4)
      console.log(`  v ${left.profile.left[i][0].toFixed(3)} · left ski ${left.profile.left[i][1]}–${left.profile.right[i][1]} · right ski mirrored ${m.left[i]?.[1]}–${m.right[i]?.[1]}`);
    console.log(`  lengths: left ${skis[0].maxY - skis[0].minY + 1}px (${skis[0].minY}–${skis[0].maxY}), right ${skis[1].maxY - skis[1].minY + 1}px (${skis[1].minY}–${skis[1].maxY}); max offset ${offset.toFixed(3)}`);
  }
  outlines[model] = {
    aspect: left.aspect,
    lengthPx: skis[0].maxY - skis[0].minY + 1,
    profile: left.profile,
    ...(asymmetric ? {profileRight: right.profile} : {}),
  };
  console.log(`${model.padEnd(18)} aspect ${left.aspect.toFixed(4)} · length ${outlines[model].lengthPx}px${asymmetric ? ' · asymmetric pair' : ''}`);
}
await writeFile(output, `${JSON.stringify(outlines)}\n`);
