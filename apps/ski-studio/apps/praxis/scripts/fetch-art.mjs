// Caches Praxis's public topsheet artwork and veneer images in art-source/.
// Existing files are skipped; requests are paced to be polite to the store's CDN.
import {access, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import catalog from '../src/configurator/data/custom-catalog.json' with {type: 'json'};

const root = path.resolve(import.meta.dirname, '..');
const exists = file => access(file).then(() => true, () => false);
const pause = ms => new Promise(r => setTimeout(r, ms));

async function cache(url, file) {
  if (await exists(file)) return false;
  const response = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 (fan concept art cache)'}});
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  await pause(400);
  return true;
}

const jobs = [
  ...[...catalog.graphics, ...catalog.signatureGraphics].map(g => [g.source, path.join(root, 'art-source/graphics', `${g.id}.jpg`)]),
  ...catalog.veneers.map(v => [v.source, path.join(root, 'art-source/veneers', `${v.id}.jpg`)]),
];
await mkdir(path.join(root, 'art-source/graphics'), {recursive: true});
await mkdir(path.join(root, 'art-source/veneers'), {recursive: true});
let fetched = 0;
for (const [url, file] of jobs) if (await cache(url, file)) fetched++;
console.log(`${jobs.length} images · ${fetched} downloaded · ${jobs.length - fetched} cached`);
