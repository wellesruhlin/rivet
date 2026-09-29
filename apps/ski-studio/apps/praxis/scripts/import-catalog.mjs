// Builds the custom-ski catalog from Praxis's public custom product pages.
//
//   art-source/pages/<slug>.html   saved copies of praxisskis.com/custom-skis/<slug>-custom-ski/
//   src/configurator/data/custom-catalog.json
//
// Prices, lengths, flex, core and option lists come from each page's order form.
// Run with `npm run import`. Pages are only re-fetched with --fetch.
import {mkdir, readFile, writeFile, access} from 'node:fs/promises';
import path from 'node:path';
import {parse} from 'node-html-parser';

const root = path.resolve(import.meta.dirname, '..');
const pagesDir = path.join(root, 'art-source/pages');
const output = path.join(root, 'src/configurator/data/custom-catalog.json');
const OBSERVED = '2026-09-24';
const MODELS = [
  ['9-d', '9 D', 'custom-skis/9-d-custom-ski'],
  ['9d8', '9D8', 'custom-skis/9d8-custom-ski'],
  ['bc', 'BC', 'custom-skis/bc-custom-ski'],
  ['bps', 'BPS', 'custom-skis/bps-custom-ski'],
  ['concept', 'Concept', 'custom-skis/concept-custom-ski'],
  ['exp', 'EXP', 'custom-skis/exp-custom-ski'],
  ['frd', 'FRD', 'custom-order-skis/frd-custom-ski'],
  ['frs', 'FRS', 'custom-skis/frs-custom-ski'],
  ['gpo', 'GPO', 'custom-skis/gpo-custom-ski'],
  ['gpo-jr', 'GPO JR', 'custom-skis/gpo-jr-custom-ski'],
  ['jedi-mind-sticks', 'Jedi Mind Sticks', 'custom-skis/jedi-mind-sticks-custom-ski'],
  ['mvp-94', 'MVP 94', 'custom-skis/mvp-94-custom-ski'],
  ['mvp-108', 'MVP 108', 'custom-skis/mvp-108-custom-ski'],
  ['piste-jib', 'Piste Jib', 'custom-skis/piste-jib-custom-ski'],
  ['powderboard', 'Powderboard', 'custom-skis/powderboard-custom-ski'],
  ['protest', 'Protest', 'custom-skis/protest-custom-ski'],
  ['quixote', 'Quixote', 'custom-skis/quixote-custom-ski'],
  ['rx', 'RX', 'custom-skis/rx-custom-ski'],
  ['slugger', 'Slugger', 'custom-skis/slugger-custom-ski'],
  ['snd', 'SND', 'custom-skis/snd-custom-ski'],
  ['ullr', 'Ullr', 'custom-skis/ullr-custom-ski'],
  ['yeti', 'Yeti', 'custom-skis/yeti-custom-ski'],
];

// Standard flex published in a model's description rather than its form label.
// Documented in the data notes; the SND form label (#4) conflicts with its description (#5).
const FLEX_BY_LENGTH = {
  gpo: {155: 3, 165: 3, 175: 3, 182: 4, 187: 4, 192: 4},
  bc: {150: 2, 160: 2, 170: 2, 180: 3, 185: 3, 190: 3},
  'mvp-94': {154: 3, 164: 3, 174: 4, 184: 4},
};
const FLEX_OVERRIDE = {snd: 5};

const text = el => (el ? el.text.replace(/\s+/g, ' ').trim() : '');
const priceOf = label => Number(label.match(/\(\+\$(\d+)\)/)?.[1] ?? 0);
const quoteOf = label => label.match(/\(\+\$(\d+)-\$(\d+)\)/)?.slice(1).map(Number) ?? null;
const clean = label => label.replace(/\s*\(\+\$[\d-$]+\)\s*$/, '').trim();
const coreId = label => {
  const l = clean(label).toLowerCase();
  const family = l.startsWith('enduro') ? 'enduro' : l.startsWith('heavy') ? 'heavy-hitter' : 'ultra-light';
  return family === 'ultra-light' ? 'ultra-light-carbon' : l.includes('carbon') ? `${family}-carbon` : family;
};
const productOf = url => url?.match(/products\/(\d+)\//)?.[1];
const exists = file => access(file).then(() => true, () => false);

async function page(slug, route) {
  const file = path.join(pagesDir, `${slug}.html`);
  if (process.argv.includes('--fetch') || !(await exists(file))) {
    const response = await fetch(`https://www.praxisskis.com/${route}/`, {headers: {'User-Agent': 'Mozilla/5.0 (fan concept catalog import)'}});
    if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
    await writeFile(file, await response.text());
    await new Promise(r => setTimeout(r, 1200));
  }
  return parse(await readFile(file, 'utf8'));
}

function fields(root) {
  return root.querySelectorAll('[data-product-option-change] .form-field').map(field => {
    const type = field.getAttribute('data-product-attribute');
    const label = text(field.querySelector('.form-label')).replace(/\(Required\)|Optional/g, '').replace(/:\s*$/, '').trim();
    let values = [];
    if (type === 'set-rectangle') values = field.querySelectorAll('input.form-radio').map(input => ({id: input.getAttribute('value'), label: text(field.querySelector(`label[for="${input.id}"]`))}));
    if (type === 'set-select') values = field.querySelectorAll('option').filter(o => o.getAttribute('value')).map(o => ({id: o.getAttribute('value'), label: text(o)}));
    if (type === 'product-list')
      values = field.querySelectorAll('li.productOptions-list-item[data-product-attribute-value]').map(li => ({id: li.getAttribute('data-product-attribute-value'), label: text(li.querySelector('label')), thumb: li.querySelector('img')?.getAttribute('data-src')}));
    return {type, label, required: !!field.querySelector('.is-required'), name: field.querySelector('[name^="attribute["]')?.getAttribute('name'), values};
  });
}

const graphics = new Map();
const signature = new Map();
let veneers;
let widths;
let molding;
let ability;
let textFields;
const models = [];

for (const [id, name, route] of MODELS) {
  const root = await page(id, route);
  const form = fields(root);
  const find = pattern => form.find(field => pattern.test(field.label));
  const lengthField = form.find(field => field.type === 'set-rectangle' && /length/i.test(field.label));
  const flexField = find(/Ski Flex/);
  const coreField = find(/Core Options/);
  const graphicField = find(/Topsheet Graphic/);
  const standardCore = coreId(coreField.label.split('=')[1]);
  const standardFlex = FLEX_OVERRIDE[id] ?? Number(flexField.label.match(/#\s*(\d)/)[1]);
  const lengths = lengthField.values.map(v => {
    const value = Number(v.label.match(/(\d{3})/)[1]);
    return {value, label: /jr/i.test(v.label) ? `${value} Jr` : String(value), junior: /jr/i.test(v.label) || undefined};
  });

  for (const graphic of graphicField.values) {
    const key = productOf(graphic.thumb);
    if (!graphics.has(key)) graphics.set(key, {id: key, name: graphic.label.replace(/^\w/, c => c.toUpperCase()), source: graphic.thumb.replace('/100x100/', '/original/').replace(/\?.*$/, ''), models: new Set()});
    graphics.get(key).models.add(id);
  }
  veneers ??= find(/Veneer/).values.map(v => ({id: productOf(v.thumb), name: clean(v.label), price: priceOf(v.label), source: v.thumb.replace('/100x100/', '/original/').replace(/\?.*$/, '')}));
  widths ??= find(/Width Adjustment/).values.map(v => ({value: /fatter/i.test(v.label) ? 'wider' : /skinnier/i.test(v.label) ? 'narrower' : 'standard', label: clean(v.label), price: priceOf(v.label), formId: v.id}));
  molding ??= find(/Molding/).values.map(v => ({value: /custom/i.test(v.label) ? 'custom' : 'standard', label: clean(v.label).replace(/\s*-\s*Contact.*$/i, ''), quote: quoteOf(v.label), formId: v.id}));
  ability ??= find(/Ability/).values.map(v => ({value: v.id, label: v.label}));
  textFields ??= form.filter(f => f.type === 'input-text').map(f => ({label: f.label, name: f.name}));

  models.push({
    id,
    name,
    productId: Number(root.querySelector('input[name="product_id"]')?.getAttribute('value')),
    url: `https://www.praxisskis.com/${route}/`,
    price: Number(text(root.querySelector('[data-product-price-without-tax]')).replace(/[^\d.]/g, '')),
    lengths,
    standardCore,
    standardFlex,
    standardFlexByLength: FLEX_BY_LENGTH[id],
    cores: coreField.values.map(v => ({value: coreId(v.label), label: clean(v.label).replace(/with carbon/i, 'with carbon'), price: priceOf(v.label)})),
  });
}

// Graphics offered on every model form the shared library; the rest are signature art.
const library = [];
for (const graphic of graphics.values()) {
  const entry = {id: graphic.id, name: graphic.name, source: graphic.source};
  if (graphic.models.size === models.length) library.push(entry);
  else signature.set(graphic.id, {...entry, models: [...graphic.models]});
}

const catalog = {
  source: 'https://www.praxisskis.com/custom-order-skis/',
  observed: OBSERVED,
  models,
  graphics: library.sort((a, b) => a.name.localeCompare(b.name)),
  signatureGraphics: [...signature.values()],
  veneers,
  widths,
  molding,
  ability,
  textFields,
};
await mkdir(path.dirname(output), {recursive: true});
await writeFile(output, `${JSON.stringify(catalog, null, 1)}\n`);
console.log(`${models.length} models · ${library.length} library graphics · ${signature.size} signature graphics · ${veneers.length} veneers`);
