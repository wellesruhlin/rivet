// Caches every colorway's product image (a top-and-base board mockup, 800 × 1200) from
// proteussnowboards.com into art-source/images/boards/. Files already cached are kept.
import {mkdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import catalog from '../src/brand/data/catalog.json' with {type: 'json'};

const root = fileURLToPath(new URL('../', import.meta.url));
const dir = `${root}art-source/images/boards/`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';
export const artName = (designId, colorway) => `${designId}--${colorway.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

await mkdir(dir, {recursive: true});
let fetched = 0;
const all = [...catalog.designs.flatMap(d => d.colorways.map(c => [artName(d.id, c.name), c.image])), ...catalog.offTheRack.flatMap(b => b.colorways.map(c => [artName(b.id, c.name), c.image]))];
for (const [name, url] of all) {
  const file = `${dir}${name}.png`;
  if (existsSync(file)) continue;
  const response = await fetch(url, {headers: {'User-Agent': UA}});
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  await writeFile(file, Buffer.from(await response.arrayBuffer()));
  fetched++;
  await new Promise(r => setTimeout(r, 200));
}
console.log(`${all.length} images, ${fetched} downloaded.`);
