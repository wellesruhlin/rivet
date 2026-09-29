// Builds src/configurator/data/bindings-catalog.json from Praxis's LOOK binding pages.
//
//   node scripts/import-bindings.mjs            rebuild from the cached pages
//   node scripts/import-bindings.mjs --fetch    re-download the pages, ask the store which
//                                               brake widths are in stock and refresh the
//                                               product photographs
//
// Cached pages live in art-source/pages/bindings/. Only the Pivot 2.0 family (and CAST's
// Pivot-based Freetour) is imported: those are the bindings the 3D study can represent.
// SPX, the Freetour upgrade kit and other brands stay on praxisskis.com.
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = `${root}art-source/pages/bindings/`;
const photos = `${root}public/art/bindings/`;
const SITE = 'https://www.praxisskis.com/ski-bindings/';
const fetchPages = process.argv.includes('--fetch');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

// [page slug (path under /ski-bindings/), colorway shown to the customer]
const PRODUCTS = [
  {id: 'pivot-18', name: 'LOOK Pivot 2.0 18 GW', family: 'Pivot 2.0', rating: 18, din: '8–18', model: 'stand-in',
    pages: [['look-bindings/look-pivot-2-0-18-gw-bluesteel', 'Blue Steel']]},
  {id: 'pivot-15', name: 'LOOK Pivot 2.0 15 GW', family: 'Pivot 2.0', rating: 15, din: '6–15', model: 'study',
    pages: [['look-pivot-2-0-15-gw-black-metal', 'Black Metal'], ['look-pivot-2-0-15-gw-orange-metal', 'Orange Metal'], ['look-bindings/look-pivot-2-0-15-gw-bluesteel', 'Blue Steel'], ['look-pivot-2-0-15-gw-super-edition', 'Super Edition']]},
  {id: 'pivot-13', name: 'LOOK Pivot 2.0 13 GW', family: 'Pivot 2.0', rating: 13, model: 'stand-in',
    pages: [['pivot-2-0-13-gw-black-metal', 'Black Metal'], ['pivot-2-0-13-gw-blue-steel', 'Blue Steel'], ['pivot-2-0-13-gw-orange-metal', 'Orange Metal']]},
  {id: 'pivot-11', name: 'LOOK Pivot 2.0 11 GW', family: 'Pivot 2.0', rating: 11, model: 'stand-in',
    pages: [['pivot-2-0-11-gw-black-metal', 'Black Metal'], ['pivot-2-0-11-gw-white-black', 'White / Black']]},
  {id: 'freetour-15', name: 'CAST Freetour 2.0 Pivot 15', family: 'Freetour 2.0', rating: 15, din: '6–15', model: 'alpine-mode', touring: true,
    pages: [['freetour-2-0-pivot-15-black-metal-raw', 'Black Metal Raw'], ['freetour-2-0-pivot-15-purple', 'Purple']]},
  {id: 'freetour-18', name: 'CAST Freetour 2.0 Pivot 18', family: 'Freetour 2.0', rating: 18, din: '8–18', model: 'alpine-mode', touring: true,
    pages: [['freetour-2-0-pivot-18-purple', 'Purple']]},
];
const EXCLUDED = ['spx-11-gw-grey-khaki', 'spx-11-gw-purple-black', 'spx-13-gw-petrol-blue', 'spx-13-gw-black', 'freetour-2-0-upgrade-kit', 'almonte-10-pt-touring-bindings', 'almonte-12-pt-touring-bindings', 'attack-lyt-11-gw-freeski-bindings', 'ambition-12-at'];

const file = slug => `${pages}${slug.split('/').pop()}.html`;
const text = html => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&reg;/g, '®').replace(/&mdash;/g, '—').replace(/&rsquo;|&#8217;/g, '’').replace(/\s+/g, ' ');
const money = value => Number(String(value).replace(/[^0-9.]/g, ''));

async function download(slug) {
  const response = await fetch(`${SITE}${slug}/`, {headers: {'User-Agent': UA}});
  if (!response.ok) throw new Error(`${slug}: HTTP ${response.status}`);
  await writeFile(file(slug), await response.text());
}

function parse(slug, html) {
  const productId = Number(html.match(/name="product_id" value="(\d+)"/)?.[1]);
  const start = html.indexOf('productView-price');
  const view = html.slice(start, start + 2500);   // this product only, not the related products further down
  const price = money(view.match(/data-product-price-without-tax[^>]*>\s*([^<]+)/)?.[1]);
  const rrp = money(view.match(/data-product-rrp-without-tax[^>]*>\s*([^<]+)/)?.[1] ?? '') || null;
  const block = html.match(/data-product-attribute="set-radio"[\s\S]*?id="radio-group-label-(\d+)"[\s\S]*?<\/label>([\s\S]*?)<\/div>/);
  if (!productId || !price || !block) throw new Error(`${slug}: product id, price or brake options not found`);
  const attribute = Number(block[1]);
  const brakes = [...block[2].matchAll(/data-product-attribute-value="(\d+)"[^>]*>\s*([0-9]+)\s*</g)].map(m => ({value: Number(m[1]), brake: Number(m[2])}));
  const image = html.match(/productView-image[\s\S]{0,2000}?(https:\/\/cdn11\.bigcommerce\.com[^"' ]+?\.(?:jpg|jpeg|png|webp))/i)?.[1];
  const body = text(html);
  const description = body.slice(body.indexOf(' Description ') + 13, body.indexOf('Related Products') > 0 ? body.indexOf('Related Products') : undefined);
  const weight = description.match(/Weight \(Alpine and Touring\) ([0-9]+)g and ([0-9]+)g/);
  return {productId, price, rrp, attribute, brakes, image, weight: weight ? {alpine: Number(weight[1]), touring: Number(weight[2])} : null};
}

// The storefront reports every in-stock brake width in one answer per product.
async function stock(parsed) {
  const body = new URLSearchParams({action: 'add', product_id: String(parsed.productId), [`attribute[${parsed.attribute}]`]: String(parsed.brakes[0].value), 'qty[]': '1'});
  const response = await fetch(`https://www.praxisskis.com/remote/v1/product-attributes/${parsed.productId}`, {
    method: 'POST', body, headers: {'User-Agent': UA, 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json'},
  });
  if (!response.ok) throw new Error(`availability ${parsed.productId}: HTTP ${response.status}`);
  const {data} = await response.json();
  return {inStock: data.in_stock_attributes ?? [], purchasable: !!data.purchasable, instock: !!data.instock, stock: data.stock ?? null};
}

async function photo(slug, url) {
  const name = slug.split('/').pop();
  const target = `${photos}${name}.webp`;
  if (!fetchPages && existsSync(target)) return `art/bindings/${name}.webp`;
  const response = await fetch(url, {headers: {'User-Agent': UA}});
  if (!response.ok) throw new Error(`${slug} photo: HTTP ${response.status}`);
  await sharp(Buffer.from(await response.arrayBuffer())).resize(480, 480, {fit: 'contain', background: '#ffffff'}).webp({quality: 84}).toFile(target);
  return `art/bindings/${name}.webp`;
}

await mkdir(pages, {recursive: true});
await mkdir(photos, {recursive: true});
const availabilityFile = `${pages}_availability.json`;
const availability = existsSync(availabilityFile) ? JSON.parse(await readFile(availabilityFile, 'utf8')) : {observed: null, products: {}};
if (fetchPages) availability.observed = new Date().toISOString().slice(0, 10);

const products = [];
for (const product of PRODUCTS) {
  const variants = [];
  const sources = [];
  let weight = null;
  for (const [slug, color] of product.pages) {
    if (fetchPages) await download(slug);
    const parsed = parse(slug, await readFile(file(slug), 'utf8'));
    if (fetchPages) availability.products[parsed.productId] = await stock(parsed);
    const known = availability.products[parsed.productId];
    if (!known) throw new Error(`${slug}: no availability recorded; run with --fetch`);
    const image = await photo(slug, parsed.image);
    weight ??= parsed.weight;
    sources.push(`${SITE}${slug}/`);
    for (const {value, brake} of parsed.brakes) {
      variants.push({
        id: `${parsed.productId}-${value}`,
        productId: parsed.productId,
        color,
        brake,
        price: parsed.price,
        listPrice: parsed.rrp,
        available: known.purchasable && known.inStock.includes(value),
        image,
        source: `${SITE}${slug}/`,
      });
    }
  }
  products.push({
    id: product.id,
    name: product.name,
    family: product.family,
    rating: product.rating,
    ...(product.din ? {din: product.din} : {}),
    model: product.model,
    touring: !!product.touring,
    bootCompatibility: product.touring ? 'Alpine ISO 5355, GripWalk ISO 23223 and touring ISO 9523 soles' : 'Alpine ISO 5355 A and GripWalk ISO 23223 A soles',
    ...(weight ? {weight} : {}),
    source: sources[0],
    variants,
  });
}

const catalog = {
  observed: availability.observed,
  source: SITE,
  fitPolicy: 'Conservative prototype screen: the brake must be at least as wide as the ski waist and at most 15 mm wider. A clearance check, not a certified fit or DIN recommendation.',
  scope: 'The LOOK Pivot 2.0 family and CAST’s Pivot-based Freetour 2.0, the bindings the 3D study can represent. Praxis also sells LOOK SPX, other brands and the Freetour upgrade kit.',
  excluded: EXCLUDED.map(slug => `${SITE}${slug}/`),
  products,
};
await writeFile(availabilityFile, `${JSON.stringify(availability, null, 1)}\n`);
await writeFile(`${root}src/configurator/data/bindings-catalog.json`, `${JSON.stringify(catalog, null, 1)}\n`);
const count = products.reduce((sum, p) => sum + p.variants.length, 0);
console.log(`${products.length} binding models, ${count} color/brake variants, ${products.flatMap(p => p.variants).filter(v => v.available).length} in stock (observed ${catalog.observed}).`);
