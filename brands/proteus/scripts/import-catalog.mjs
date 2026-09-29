// Builds src/data/catalog.json from Proteus's public shop pages, cached in
// art-source/pages/ (`node scripts/import-catalog.mjs -- --fetch` re-downloads them).
//
// Boards: every made-to-order design with its collection, colorways (and their product
// images), stiffness prices and sizes; the off-the-rack boards; accessories and the custom
// programme's fees. The size chart (an outlined SVG) and the stiffness builds (technology
// page) are transcribed in src/specs.js, not parsed here.
import {mkdir, readFile, readdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pages = `${root}art-source/pages/`;
const products = `${pages}products/`;
const SITE = 'https://www.proteussnowboards.com';
const fetchPages = process.argv.includes('--fetch');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0 Safari/537.36';

const decode = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#0?39;|&#8217;|&rsquo;/g, '’').replace(/&#8216;/g, '‘').replace(/&#8220;|&#8221;/g, '"').replace(/&#8211;/g, '–').replace(/&#8212;/g, '—').replace(/&#038;|&amp;/g, '&').replace(/&nbsp;|&#160;/g, ' ').replace(/&#036;/g, '$');
const text = html => decode(html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
const fullSize = url => url?.replace(/-\d+x\d+(\.[a-z]+)$/i, '$1') ?? null;

async function download(url, file) {
  const response = await fetch(url, {headers: {'User-Agent': UA}});
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  await writeFile(file, await response.text());
}

// Product categories on proteussnowboards.com. "Freshies" is a featured row on the shop
// page (designs that also sit in one of these collections), read from the shop page.
const COLLECTIONS = [
  {id: 'proteus', label: 'Proteus designs', category: 'proteus-boards'},
  {id: 'collaborations', label: 'Artist & rider collaborations', category: 'featured-boards'},
];

function parseBoard(slug, html) {
  const name = decode(html.match(/<meta property="og:title" content="([^"]*)"/)?.[1] ?? slug).replace(/ - Proteus Snowboards$/, '');
  const productId = Number(html.match(/name="product_id" value="(\d+)"/)?.[1] ?? html.match(/data-product_id="(\d+)"/)?.[1]);
  const classes = html.match(/<div id="product-\d+" class="([^"]*)"/)?.[1] ?? '';
  const categories = [...classes.matchAll(/product_cat-([a-z0-9-]+)/g)].map(m => m[1]);
  const description = text(html.match(/woocommerce-product-details__short-description">([\s\S]*?)<\/div>/)?.[1] ?? '');
  const raw = html.match(/data-product_variations="([^"]*)"/)?.[1];
  const variations = raw ? JSON.parse(decode(raw)) : [];
  const stiffness = Object.fromEntries(variations.map(v => [v.attributes.attribute_pa_stiffness, v.display_price]).filter(([k]) => k));
  const status = text(decode(variations[0]?.availability_html ?? '')) || (/stock out-of-stock/.test(html.slice(0, html.indexOf('related products'))) ? 'Out of stock' : 'In stock');
  const selects = Object.fromEntries([...html.matchAll(/<select[^>]*name="([^"]*)"[^>]*>([\s\S]*?)<\/select>/g)].map(m => [m[1], [...m[2].matchAll(/<option[^>]*value="([^"]*)"[^>]*>([^<]*)</g)].filter(o => o[1]).map(o => ({value: o[1], label: decode(o[2]).trim()}))]));
  // Colorway images: the product-configurator layers JSON maps each colorway to its image.
  const layers = html.match(/<script class="iconic-pc-layers-\d+" type="application\/json">\s*([\s\S]*?)<\/script>/)?.[1];
  const colorways = [];
  if (layers) {
    const data = JSON.parse(layers);
    for (const set of Object.values(data)) for (const [colorway, entry] of Object.entries(set)) {
      const src = entry.image_html?.match(/src=\\?"([^"\\]*)/)?.[1] ?? entry.image_html?.match(/src="([^"]*)"/)?.[1];
      if (src) colorways.push({name: decode(colorway), image: fullSize(src.replace(/\\\//g, '/'))});
    }
  }
  if (!colorways.length) {
    const main = html.match(/woocommerce-product-gallery__image[^>]*>[\s\S]*?<img[^>]*src="([^"]*)"/)?.[1];
    for (const option of selects['attribute_2-pick-your-color'] ?? []) colorways.push({name: option.label, image: fullSize(main)});
    if (!colorways.length && main) colorways.push({name: 'Standard', image: fullSize(main)});
  }
  // Ready-to-ride boards are simple products: one price and a "Board Details" list.
  const price = Number(html.slice(0, html.indexOf('related products')).match(/<p class="price">[\s\S]*?([\d,]+\.\d\d)/)?.[1]?.replace(/,/g, '')) || null;
  const details = description.match(/Design:\s*(.+?)\s+Size:\s*(\d+W?)\b.*?Flex:\s*(\w+).*?Overall Condition:\s*(.+?)\s+Construction:\s*(\d{4})/);
  return {slug, name, productId, categories, description, stiffness, status, price, details, sizes: (selects.attribute_pa_size ?? []).map(o => o.label), colorways, source: `${SITE}/shop/${slug}/`};
}

await mkdir(products, {recursive: true});
if (fetchPages) {
  await download(`${SITE}/shop/`, `${pages}_shop.html`);
  const shop = await readFile(`${pages}_shop.html`, 'utf8');
  for (const url of new Set([...shop.matchAll(/href="(https:\/\/www\.proteussnowboards\.com\/shop\/[a-z0-9-]+\/)"/g)].map(m => m[1]))) {
    await download(url, `${products}${url.split('/').at(-2)}.html`);
    await new Promise(r => setTimeout(r, 350));
  }
}

const boards = [];
const accessories = [];
for (const file of (await readdir(products)).filter(f => f.endsWith('.html'))) {
  const html = await readFile(`${products}${file}`, 'utf8');
  const slug = file.replace(/\.html$/, '');
  const classes = html.match(/<div id="product-\d+" class="([^"]*)"/)?.[1] ?? '';
  if (!/product_cat-(proteus-boards|featured-boards|ready-boards|discount-boards)/.test(classes)) continue;
  boards.push(parseBoard(slug, html));
}

// Accessories and custom sidewall text, as offered on every board page.
const sample = await readFile(`${products}mt-fuji.html`, 'utf8');
for (const m of sample.matchAll(/data-price="([^"]*)"[^>]*data-label="([^"]*)"/g)) {
  const label = decode(m[2]).replace(/\s*\(Included\)\s*/, '').trim();
  accessories.push({id: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-$/, ''), label, price: Number(m[1]) || 0, included: /Included/.test(m[2])});
}

const madeToOrder = boards.filter(b => COLLECTIONS.some(c => b.categories.includes(c.category)));
// The shop page's featured "Freshies" row: the product links between its heading and the next.
const shopHtml = await readFile(`${pages}_shop.html`, 'utf8');
const freshSection = shopHtml.slice(shopHtml.indexOf('>Freshies<'), shopHtml.indexOf('Artist &amp; Rider Collaborations'));
const freshies = new Set([...freshSection.matchAll(/\/shop\/([a-z0-9-]+)\//g)].map(m => m[1]));
const catalog = {
  source: `${SITE}/shop/`,
  observed: new Date().toLocaleDateString('en-CA'),
  status: madeToOrder[0]?.status ?? '',
  collections: COLLECTIONS.map(({id, label}) => ({id, label})),
  designs: madeToOrder.map(b => ({
    id: b.slug,
    name: b.name,
    collection: COLLECTIONS.find(c => b.categories.includes(c.category)).id,
    fresh: freshies.has(b.slug),
    description: b.description,
    prices: b.stiffness,
    colorways: b.colorways,
    source: b.source,
    productId: b.productId,
  })).sort((a, b) => COLLECTIONS.findIndex(c => c.id === a.collection) - COLLECTIONS.findIndex(c => c.id === b.collection) || a.name.localeCompare(b.name)),
  offTheRack: boards.filter(b => !madeToOrder.includes(b)).map(b => {
    // "Mt. Fuji Tea House" is the design Mt. Fuji in its Tea House colorway.
    const [, designText = '', size = '', flex = '', condition = '', year = ''] = b.details ?? [];
    const design = madeToOrder.find(d => designText.toLowerCase().startsWith(d.name.toLowerCase()));
    const rest = designText.slice(design?.name.length ?? 0).replace(/^[\s–—-]+/, '').toLowerCase();
    const colorway = design && design.colorways.find(c => rest === c.name.toLowerCase());
    return {
      id: b.slug, name: b.name.replace(/\s*–\s*/, ' – '), category: b.categories.find(c => /ready|discount/.test(c)), status: b.status, price: b.price,
      design: design?.slug ?? null, colorway: colorway?.name ?? null, size, stiffness: flex.toLowerCase(), condition, year: Number(year) || null,
      colorways: b.colorways, source: b.source,
    };
  }),
  sizes: boards.find(b => b.slug === 'mt-fuji').sizes,
  accessories,
};
await writeFile(`${root}src/data/catalog.json`, `${JSON.stringify(catalog, null, 1)}\n`);
console.log(`${catalog.designs.length} designs (${catalog.collections.map(c => `${catalog.designs.filter(d => d.collection === c.id).length} ${c.id}`).join(', ')}), ${catalog.designs.reduce((n, d) => n + d.colorways.length, 0)} colorways, ${catalog.offTheRack.length} other boards, ${accessories.length} accessories. Status: ${catalog.status}.`);
