// Proteus Snowboards brand pack for the shared configurator engine.
//
// Designs, colorways, prices, stiffness options, sizes and accessories come from
// Proteus's public shop (data/catalog.json, scripts/import-catalog.mjs); the size chart,
// builds and camber settings are transcribed in specs.js. Every board is one all-mountain
// twin with Proteus's Adjustable Camber; the customer chooses its size, graphic, build and
// extras, and tries camber settings the rider changes on the hill with the included wrench.
//
// Field widgets are React components the app attaches (see widgets.jsx), so this pack
// stays importable in Node for the tests.
import {formatMoney} from '@rivet/configurator/engine';
import {BASE_COLORS, baseColor, BASE_ZONES, customLayers, designLayers, uploadedArt} from './art.js';
import {artShape} from './geometry.js';
import {createModel3d} from './model3d.js';
import {catalog, CAMBER_PRESETS, describeCamber, SIZES, sizeById, sizeLabel, STIFFNESS, stiffnessOf} from './specs.js';

export {catalog};

export const BASE_PRICE = catalog.designs.find(d => d.collection === 'proteus').prices.flex;
export const COLLAB_PRICE = catalog.designs.find(d => d.collection === 'collaborations').prices.flex - BASE_PRICE;
export const CUSTOM_FEE = 50;
export const DEFAULT_DESIGN = 'mt-fuji';
// The colorway a design opens in (its first, unless Proteus features another).
const OPENING_COLORWAY = {'mt-fuji': 'Tea House'};
export const DISPLAY_SIZE = '157';
const accessoryPrice = id => catalog.accessories.find(a => a.id === id)?.price ?? 0;

const designsById = new Map(catalog.designs.map(d => [d.id, d]));
export const designById = id => designsById.get(id);
export const collectionOf = design => catalog.collections.find(c => c.id === design?.collection);
export const readyBoards = catalog.offTheRack;

// The ready-to-ride board, if any, that is exactly this build.
export function readyBoardFor(config, ctx) {
  if (ctx.custom || !ctx.size) return null;
  return readyBoards.find(b => b.design === config.design && b.colorway === ctx.colorway?.name && b.size === config.length && b.stiffness === config.stiffness) ?? null;
}

function context(config) {
  const size = sizeById(config.length) ?? null;
  const custom = config.design === 'custom';
  const design = custom ? null : designById(config.design) ?? designById(DEFAULT_DESIGN);
  const colorway = design?.colorways.find(c => c.name === config.colorway) ?? design?.colorways.find(c => c.name === OPENING_COLORWAY[design.id]) ?? design?.colorways[0] ?? null;
  const upload = custom ? uploadedArt.get(config.artFile) : null;
  const ctx = {
    size,
    displaySize: size ?? sizeById(DISPLAY_SIZE),
    lengths: SIZES.map(s => s.id),
    custom,
    design,
    colorway,
    upload,
    collection: collectionOf(design),
    stiffness: stiffnessOf(config.stiffness) ?? stiffnessOf('standard'),
    // The build bar and saved-build notices name the board by its graphic.
    model: {id: 'proteus', name: custom ? 'Custom Proteus' : design?.name ?? 'Proteus'},
  };
  ctx.readyBoard = readyBoardFor(config, ctx);
  return ctx;
}

export const designLine = (config, ctx) => (ctx.custom ? `Your artwork${config.artFile ? ` · ${config.artFile}` : ' · not uploaded yet'}` : `${ctx.design.name} · ${ctx.colorway?.name ?? ''}`);

// The art for any design (gallery tiles use each design's first colorway).
const art = {
  key: (config, ctx) => (ctx.custom ? `custom|${config.artFile}|${ctx.upload?.id ?? 'missing'}|${config.baseNose}|${config.baseBlock}|${config.baseBody}` : `${ctx.design.id}|${ctx.colorway?.name}`),
  layers: (config, ctx, box) => (ctx.custom
    ? customLayers({upload: ctx.upload, nose: config.baseNose, block: config.baseBlock, body: config.baseBody}, box)
    : designLayers(ctx.design.id, ctx.colorway.name, box)),
};

const steps = [
  {id: 'size', label: 'Size', title: 'Size', intro: 'One shape, eleven sizes. Start with your weight; wide sizes add width underfoot for bigger boots.', link: {href: 'https://www.proteussnowboards.com/contact-us/', strong: 'Between two sizes?', text: 'Ask Proteus'}},
  {id: 'graphics', label: 'Graphics', title: 'Graphics', intro: 'Fifty-three designs, from Proteus’s own to artist and rider collaborations, or your own artwork on the topsheet and your colors on the base.'},
  {id: 'build', label: 'Build', title: 'Build', intro: 'Four builds set by glass weight and fiber orientation. Every one has the same core, carbon and Thru-Stitch Kevlar.', footnote: 'Build prices from Proteus’s board pages, above the Flex build.'},
  {id: 'camber', label: 'Camber', title: 'Camber', intro: 'Every Proteus has Adjustable Camber: one screw sets the nose, one sets the tail, anywhere from full camber to full rocker. Try it here; you change it on the hill with the included wrench.'},
  {id: 'extras', label: 'Extras', title: 'Extras', intro: 'Accessories, and up to twelve letters or numbers printed on the sidewall at no charge.'},
  {id: 'review', label: 'Review', title: 'Review', intro: 'Every choice in one place. Proteus builds to order in Lakewood, Colorado; nothing here places an order.', link: {href: 'https://www.proteussnowboards.com/shop/', strong: 'Ready to order?', text: 'Continue at proteussnowboards.com'}},
];
const stepIndex = id => steps.findIndex(step => step.id === id);

const baseColorGroup = (id, fallback, extra = {}) => ({
  id,
  type: 'choice',
  step: 'graphics',
  label: BASE_ZONES.find(z => z.group === id).label,
  options: () => BASE_COLORS,
  default: () => fallback,
  bom: false,
  explain: false,
  ui: {visible: () => false},
  ...extra,
});

const groups = [
  {
    // The board itself: always the same shape, priced as Proteus's base board.
    id: 'model',
    type: 'choice',
    step: 'size',
    label: 'Board',
    bomLabel: 'Proteus snowboard',
    fixed: () => 'proteus',
    options: () => [{value: 'proteus', label: 'All-mountain twin'}],
    price: () => BASE_PRICE,
    explain: false,
    ui: {visible: () => false},
  },
  {
    id: 'length',
    type: 'choice',
    step: 'size',
    label: 'Size',
    required: true,
    options: () => SIZES.map(s => ({value: s.id, label: s.id, wide: s.wide})),
    default: () => '',
    format: value => (sizeById(value) ? `${sizeLabel(sizeById(value))}` : 'Choose your size'),
    ui: {
      size: true,
      barLabel: value => value,
      field: 'Board size · cm',
      action: {label: 'Size chart', guide: 'size'},
    },
  },
  {id: 'riderWeight', type: 'number', step: 'size', label: 'Rider weight', min: 50, max: 350, bom: false, share: false, explain: false, ui: {visible: () => false}},
  {
    id: 'design',
    type: 'gallery',
    step: 'graphics',
    label: 'Graphic',
    bomLabel: 'Graphic',
    resets: ['colorway'],
    options: () => [
      ...catalog.designs.map(d => ({value: d.id, label: d.name, collection: d.collection, fresh: d.fresh, colorways: d.colorways.length})),
      {value: 'custom', label: 'Your own artwork', extra: true},
    ],
    default: () => DEFAULT_DESIGN,
    price: value => (value === 'custom' ? CUSTOM_FEE : designById(value)?.collection === 'collaborations' ? COLLAB_PRICE : 0),
    format: (value, config, ctx) => designLine(config, ctx),
    ui: {action: {label: 'Custom art guide', guide: 'custom'}, field: 'Topsheet graphic'},
  },
  {
    id: 'colorway',
    type: 'choice',
    step: 'graphics',
    label: 'Colorway',
    bom: false,
    explain: false,
    options: (config, ctx) => (ctx.design?.colorways ?? []).map(c => ({value: c.name, label: c.name})),
    default: (config, ctx) => (ctx.design && OPENING_COLORWAY[ctx.design.id]) ?? ctx.design?.colorways[0]?.name ?? '',
    ui: {visible: () => false},
  },
  {id: 'artFile', type: 'text', step: 'graphics', label: 'Artwork file', maxLength: 120, share: false, ui: {visible: config => config.design === 'custom', reviewLabel: 'Artwork file'}},
  baseColorGroup('baseNose', 'charcoal', {
    bomLabel: 'Base colors',
    bom: config => config.design === 'custom',
    format: (value, config) => [config.baseNose, config.baseBlock, config.baseBody].map(id => baseColor(id).label).join(' · '),
    ui: {visible: config => config.design === 'custom', field: 'Base colors'},
  }),
  baseColorGroup('baseBlock', 'white'),
  baseColorGroup('baseBody', 'charcoal'),
  {
    id: 'stiffness',
    type: 'choice',
    step: 'build',
    label: 'Build',
    bomLabel: 'Build',
    options: () => STIFFNESS.map(b => ({value: b.id, label: b.label, badge: b.id === 'standard' ? 'All-mountain' : undefined})),
    default: () => 'standard',
    price: value => stiffnessOf(value)?.price ?? 0,
    format: value => `${stiffnessOf(value)?.label ?? ''} build`,
    ui: {field: 'Stiffness · soft and playful to stiff and aggressive', action: {label: 'Stiffness guide', guide: 'stiffness'}},
  },
  {
    // Nose and tail settings, 0 (full camber) to 100 (full rocker). One line in the build sheet.
    id: 'nose',
    type: 'number',
    step: 'camber',
    label: 'Nose',
    bomLabel: 'Camber setting',
    min: 0,
    max: 100,
    default: () => 0,
    format: (value, config) => describeCamber(config.nose, config.tail),
    line: () => ({info: true}),
    ui: {bare: true},
  },
  {id: 'tail', type: 'number', step: 'camber', label: 'Tail', min: 0, max: 100, default: () => 0, bom: false, explain: false, ui: {visible: () => false}},
  {
    id: 'snowStopper',
    type: 'toggle',
    step: 'extras',
    label: 'Snow Stopper',
    price: () => accessoryPrice('snow-stopper'),
    bom: config => config.snowStopper,
    format: value => (value ? 'Added' : 'Not added'),
    ui: {fieldGroup: 'Accessories', description: 'A flexible urethane plug that keeps snow out of the adjustment port, so you can adjust without clearing it. Tethered to the board.'},
  },
  {
    id: 'wax',
    type: 'toggle',
    step: 'extras',
    label: 'All Temp Board Wax',
    price: () => accessoryPrice('all-temp-board-wax'),
    bom: config => config.wax,
    format: value => (value ? 'Added' : 'Not added'),
    ui: {fieldGroup: 'Accessories', description: 'Every board needs wax before it’s ridden; an all-temperature base coat to start you off.'},
  },
  {
    id: 'wrench',
    type: 'toggle',
    step: 'extras',
    label: 'Adjustment Wrench',
    fixed: () => true,
    price: () => 0,
    format: () => 'Included',
    ui: {fieldGroup: 'Accessories', description: 'Ratcheting 12-point ¼ in wrench with a CNC handle that extends for leverage. Included with every board.'},
  },
  {
    id: 'sidewallText',
    type: 'text',
    step: 'extras',
    label: 'Sidewall text',
    maxLength: 12,
    // Proteus accepts letters and numbers only.
    sanitize: text => text.replace(/[^A-Za-z0-9]/g, ''),
    ui: {reviewLabel: 'Sidewall text'},
  },
];

const model3d = createModel3d({art, designLine});

const PRICE_LABELS = {
  model: () => 'Proteus snowboard',
  design: line => (line.value.startsWith('Your artwork') ? 'Custom graphic processing' : line.price ? `Collaboration graphic · ${line.value.split(' · ')[0]}` : `${line.value.split(' · ')[0]} graphic`),
  stiffness: line => line.value,
  snowStopper: () => 'Snow Stopper',
  wax: () => 'All Temp Board Wax',
  wrench: () => 'Adjustment Wrench',
};

const pack = {
  id: 'proteus',
  name: 'Proteus',
  currency: 'USD',
  steps,
  groups,
  context,
  ready: (config, ctx) => !!ctx.size,
  orderRequirements: (config, ctx) => (ctx.custom && !config.artFile ? [{label: 'upload your artwork (or plan to email it to Proteus)', step: stepIndex('graphics')}] : []),
  // Each step opens the view that shows what it changes.
  viewForField: (field, step) => {
    if (['baseNose', 'baseBlock', 'baseBody'].includes(field)) return 'Base';
    if (field === 'nose' || field === 'tail') return 'Camber';
    if (field === 'stiffness') return 'Construction';
    if (field === 'sidewallText') return 'Sidewall';
    if (['snowStopper', 'wax', 'wrench'].includes(field)) return '3D';
    return {build: 'Construction', camber: 'Camber', extras: 'Sidewall'}[steps[step]?.id] ?? 'Topsheet';
  },
  fileName: (config, ctx) => `Proteus-${(ctx.custom ? 'Custom' : ctx.design.name).replace(/[^A-Za-z0-9]+/g, '-')}-${config.length || 'unsized'}-build.txt`,
  copy: {
    exportTitle: 'PROTEUS SNOWBOARDS — BUILD SHEET (INDEPENDENT CONCEPT)',
    totalLabel: 'Reference total',
    incompleteDraft: 'Incomplete draft: choose a size.',
    exportNotes: [
      `Independent concept. No order has been placed. Prices are Proteus’s listed prices (USD) and exclude shipping and tax. Proteus listed its boards as “${catalog.status}” when observed; confirm availability with Proteus.`,
      'Camber is not an option you buy: every board adjusts from full camber to full rocker with the included wrench. The setting listed is the one tried in this preview.',
      'Custom graphics carry Proteus’s $50 processing fee. Proteus reviews every file against its design guidelines before production.',
      `Source: ${catalog.source} (observed ${catalog.observed}).`,
    ],
    sheetEyebrow: 'One board · your configuration',
    sheetNote: 'The starting graphic, Standard build and full camber are defaults until you review them. Prices exclude shipping and tax; Proteus confirms every board before it’s built.',
    priceNote: 'Listed prices from proteussnowboards.com. Excludes shipping and tax; Proteus confirms price and lead time (2–8 weeks for custom boards).',
    emptyBuild: 'Your Proteus',
    firstStep: {cta: 'Select your size', short: 'Select size', chip: 'Choose your size', missing: 'select a size'},
    loading: 'Loading your board…',
    linkNote: 'A build link includes your board choices, not uploaded artwork.',
    backLabel: 'Back to your board',
  },
  exportHeader: (config, ctx) => [
    ...(ctx.readyBoard ? [`In stock at Proteus as a ready board: ${ctx.readyBoard.name}, ${formatMoney(ctx.readyBoard.price)} (${ctx.readyBoard.condition.toLowerCase()}).`, ''] : []),
    ...(config.sidewallText ? [`Sidewall text: ${config.sidewallText}`] : []),
  ],
  review: {
    priceKeys: ['model', 'design', 'stiffness', 'snowStopper', 'wax', 'wrench'],
    priceLabel: line => PRICE_LABELS[line.key]?.(line) ?? line.value,
  },
  stage: {sampleModel: 'proteus', preferredLength: DISPLAY_SIZE},
  model3d,
  art: {
    faces: ['Topsheet'],
    shape: (config, ctx) => artShape(ctx.displaySize),
    // A design as a pair of boards: its topsheet beside its base.
    swatch: (item, groupId, config, ctx) => {
      const shape = artShape(ctx.displaySize);
      const box = {width: shape.width, length: shape.length};
      const layers = item.value === 'custom'
        ? customLayers({upload: uploadedArt.get(config.artFile), nose: config.baseNose, block: config.baseBlock, body: config.baseBody}, box)
        : designLayers(item.value, item.value === config.design ? ctx.colorway.name : OPENING_COLORWAY[item.value] ?? designById(item.value).colorways[0].name, box);
      return {left: layers.top, right: layers.base};
    },
  },
};

export {CAMBER_PRESETS};
export default pack;
