// Recover the original public PNG pixels. No upscaling, generated detail,
// sharpening halos, saturation edits, or additional lossy encoding.
import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import catalog from '../src/catalog.json' with {type: 'json'};
import {CROPS, artName} from '../src/art.js';

const root = path.resolve(import.meta.dirname, '..');
const brand = root;
const out = path.join(brand, 'public/art/print');
await mkdir(out, {recursive: true});
const jobs = [...catalog.tops.map(graphic => ({graphic, kind: 'top'})), ...catalog.bases.map(graphic => ({graphic, kind: 'base'}))];
const manifest = [];
let done = 0;
async function worker() {
  while (jobs.length) {
    const {graphic, kind} = jobs.shift();
    const file = `${artName(graphic)}.png`;
    const output = path.join(out, file);
    const metadataFile = `${output}.json`;
    try {
      await access(output);
      manifest.push(JSON.parse(await readFile(metadataFile, 'utf8')));
    } catch {
      const response = await fetch(graphic.source, {signal: AbortSignal.timeout(40000)});
      if (!response.ok) throw Error(`${graphic.name}: ${response.status}`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const meta = await sharp(bytes).metadata();
      if (meta.width !== 1000 || meta.height !== 1600) throw Error(`Uncalibrated source size for ${graphic.name}: ${meta.width} × ${meta.height}`);
      const {x, y, w, h} = CROPS.stage[kind];
      await sharp(bytes).extract({left: x, top: y, width: w, height: h}).png({compressionLevel: 9}).toFile(output);
      const record = {id: graphic.id, name: graphic.name, file, source: graphic.source, sourceWidth: meta.width, sourceHeight: meta.height, sha256: createHash('sha256').update(bytes).digest('hex'), retrieved: new Date().toISOString(), crop: {x, y, w, h}};
      await writeFile(metadataFile, JSON.stringify(record, null, 2));
      manifest.push(record);
    }
    done++;
    if (done % 50 === 0) console.log(`${done} original artworks recovered`);
  }
}
await Promise.all(Array.from({length: 5}, worker));
await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest.sort((a, b) => a.file.localeCompare(b.file)), null, 2));
console.log(`Complete: ${done} lossless print crops.`);
