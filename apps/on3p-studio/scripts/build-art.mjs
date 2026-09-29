// Builds delivery-sized artwork from the full ON3P print canvases.
//
//   art-source/<name>        1000 × 1600 originals (not shipped)
//   public/art/stage/<name>  native-resolution crop of the ski pair for the stage
//   public/art/thumb/<name>  small crop of the tips for gallery tiles
//
// Run with `npm run art`. Existing outputs newer than their source are skipped.
import {mkdir, readdir, stat} from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import catalog from '../src/brand/catalog.json' with {type: 'json'};
import {CROPS, THUMB_WIDTH, artName} from '../src/brand/art.js';

const root = path.resolve(import.meta.dirname, '..');
// ON3P artwork lives once, in the brand pack.
const brand = path.resolve(root, '../../brands/on3p');
const sourceDir = path.join(brand, 'art-source');
const outDirs = {stage: path.join(brand, 'public/art/stage'), thumb: path.join(brand, 'public/art/thumb')};

const newer = async (output, input) => {
  try {
    return (await stat(output)).mtimeMs >= (await stat(input)).mtimeMs;
  } catch {
    return false;
  }
};

async function derive(graphic, kind, sources) {
  const name = artName(graphic);
  const file = sources.get(name);
  if (!file) throw new Error(`Missing source artwork for ${graphic.name} (${name})`);
  const input = path.join(sourceDir, file);
  const results = {};
  for (const [variant, crops] of Object.entries(CROPS)) {
    const output = path.join(outDirs[variant], `${name}.webp`);
    if (!(await newer(output, input))) {
      const {x, y, w, h} = crops[kind];
      let image = sharp(input).extract({left: x, top: y, width: w, height: h});
      if (variant === 'thumb') image = image.resize({width: THUMB_WIDTH});
      await image.webp({quality: variant === 'stage' ? 84 : 78, alphaQuality: 90, effort: 5}).toFile(output);
    }
    results[variant] = (await stat(output)).size;
  }
  return results;
}

await Promise.all(Object.values(outDirs).map(dir => mkdir(dir, {recursive: true})));
const sources = new Map((await readdir(sourceDir)).map(file => [file.replace(/\.[^.]+$/, ''), file]));
const totals = {stage: 0, thumb: 0};
const jobs = [...catalog.tops.map(g => [g, 'top']), ...catalog.bases.map(g => [g, 'base'])];
for (const [graphic, kind] of jobs) {
  const sizes = await derive(graphic, kind, sources);
  totals.stage += sizes.stage;
  totals.thumb += sizes.thumb;
}
const mb = bytes => `${(bytes / 1048576).toFixed(1)} MB`;
console.log(`${jobs.length} graphics · stage ${mb(totals.stage)} · thumbnails ${mb(totals.thumb)}`);
