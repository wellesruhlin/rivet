// ON3P brand pack for the shared configurator engine.
// Rules and prices follow the public builder snapshot described in PRODUCT-RELATIONSHIPS.md.
import catalog from './catalog.json' with {type: 'json'};
import compatibility from './compatibility.json' with {type: 'json'};
import {formatWeight} from '@ski-studio/configurator/engine';
import {CROPS, PAIR_LEFTS, SKI_BOTTOM, SKI_TOP, SKI_WIDTH, cropLayer, skiPath, stageArt, thumbArt, waistInset} from './art.js';

export {catalog, compatibility};

// Reference prices observed on the public builder. Metal uses the regular $150
// upgrade rather than the temporary introductory offer.
export const PRICES = {skis: 1099, sidewall: 50, flex: 50, detune: 25, skinClip: 50};

export const categories = [
  {id: 'Park', description: 'Centered stance. Rails, butters, and park laps.', models: ['mango-90', 'mango-102', 'mango-114', 'oski-102']},
  {id: 'Freestyle', description: 'A balanced stance. The whole mountain is your playground.', models: ['jeffrey-92', 'jeffrey-98', 'jeffrey-106', 'jeffrey-112', 'jeffrey-118', 'jeffrey-124']},
  {id: 'Freeride', description: 'A forward stance. Drive turns, charge chop, chase snow.', models: ['woodsman-92', 'woodsman-100', 'woodsman-108', 'billy-goat-102', 'billy-goat-108', 'billy-goat-114', 'billy-goat-118', 'cease-and-desist']},
  {id: 'Touring', description: 'Earn your turns. Five touring shapes, starting with Tour layup.', models: ['woodsman-100', 'woodsman-108', 'billy-goat-102', 'billy-goat-108', 'billy-goat-114']},
];

// Weight deltas are ON3P's published per-ski ranges relative to the Stock layup.
export const layups = [
  {id: 'Stock', price: 0, tag: 'The ON3P feel', description: 'Full bamboo. Maximum durability and damping.', tradeoff: 'The heaviest non-metal option, with a thick base and edges built for repeated seasons.', core: '100% bamboo', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: 'Baseline', weightDelta: [0, 0]},
  {id: 'LITE', price: 100, tag: 'Lighter resort laps', description: 'Full bamboo, with a thinner base and edges.', tradeoff: 'A softer feel and less weight, with some durability and stability traded away.', core: '100% bamboo', base: '1.4 mm', edge: '2.2 × 2.0 mm', weight: '100–150 g lighter / ski', weightDelta: [-150, -100]},
  {id: '50/50', price: 150, tag: 'Resort to skintrack', description: 'A bamboo / paulownia core. Stock-thickness base and edges.', tradeoff: 'Balances uphill weight and downhill performance. Less resistant to big impacts than full bamboo.', core: 'Bamboo / paulownia', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: '175–225 g lighter / ski', weightDelta: [-225, -175]},
  {id: 'Tour', price: 150, tag: 'Earn your turns', description: 'Hybrid core, lighter base and edges.', tradeoff: 'The lightest layup gives up stability in variable snow and some impact protection.', core: 'Bamboo / paulownia', base: '1.4 mm', edge: '2.2 × 2.0 mm', weight: '325–400 g lighter / ski', weightDelta: [-400, -325]},
  {id: 'Leaf Spring', price: 150, tag: 'Power underfoot', description: 'Bamboo and Scalium metal through the running length.', tradeoff: 'More damping and support underfoot while retaining playful tips and tails. Adds weight.', core: 'Bamboo + Scalium', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: '75–100 g heavier / ski', weightDelta: [75, 100]},
  {id: 'Torsion Bar', price: 150, tag: 'Stay on the gas', description: 'Bamboo and Scalium extending into the rocker.', tradeoff: 'More edge hold and stability, with less playfulness at lower speeds. Adds weight.', core: 'Bamboo + Scalium', base: '1.8 mm', edge: '2.5 × 2.5 mm', weight: '75–100 g heavier / ski', weightDelta: [75, 100]},
];

export const flexOptions = [
  {id: 'Stock', hint: 'The flex designed for this model.'},
  {id: 'Stiff', hint: 'More support at speed and on landings; less low-speed playfulness.'},
  {id: 'Soft', hint: 'Easier to bend and butter; less support at high speeds.'},
  {id: 'Double Soft', hint: 'Maximum playfulness; gives up the most landing support and stability.'},
];

export const sidewalls = [['Black', '#151515'], ['White', '#ffffff'], ['Blue', '#235aba'], ['Green', '#3b9645'], ['Purple', '#773bb0'], ['Red', '#d63237'], ['Pink', '#f380be'], ['Orange', '#f5812b'], ['Yellow', '#efe333']];

const modelsByHandle = new Map(catalog.models.map(m => [m.handle, {...m, id: m.handle}]));
const topsById = new Map(catalog.tops.map(g => [g.id, g]));
const basesById = new Map(catalog.bases.map(g => [g.id, g]));
export const modelByHandle = handle => modelsByHandle.get(handle);
export const familyOf = m => (m.handle === 'oski-102' ? 'Oski' : m.handle === 'cease-and-desist' ? 'Cease & Desist' : m.family);
export const canRipper = (model, length) => !!model && !!compatibility.models[model.handle]?.ripperLengths.includes(length);

const colorNames = new Set(['Onyx', 'Ivory', 'Oxblood', 'Petrol', 'Violet', 'Scarlet', 'Spruce', 'Cobalt', 'Fuschia', 'Tangerine', 'Acid', 'Turquoise', 'Pink', 'Teal', 'Yellow', 'Orange', 'Green', 'Purple', 'Black', 'White']);
export const graphicCategory = g => (g.name.startsWith('Blackout') ? 'Blackout' : colorNames.has(g.name) || g.name.startsWith('Flo-') ? 'Color' : g.name.startsWith('Wood ') ? 'Wood' : 'Graphic');
export const artworkPrice = (key, id) => compatibility.prices[key === 'top' ? 'tops' : 'bases'][id] || 0;

function context(config) {
  const model = modelsByHandle.get(config.model);
  const rules = model ? compatibility.models[model.handle] : undefined;
  return {
    model,
    rules,
    category: categories.find(g => g.id === config.category),
    lengths: rules?.lengths ?? [],
    spec: model?.lengths.find(l => l.length_cm === config.length),
  };
}

export function rockerReason(config, ctx = context(config)) {
  const r = ctx.rules;
  if (!r) return 'Choose a model and length first.';
  if (!r.verified) return 'Custom rocker for Mango 114 needs ON3P confirmation.';
  if (!r.ripperLengths.length) return `${ctx.model.name} uses Signature rocker only.`;
  if (!config.length) return 'Choose a length first.';
  return `Ripper is offered at ${r.ripperLengths.join(', ')} cm for this model.`;
}

// Why a construction option is unavailable for the current build, or ''.
export function optionReason(config, field, value, ctx = context(config)) {
  const r = ctx.rules;
  if (!r) return 'Choose your shape first.';
  const custom = (field === 'layup' && value !== 'Stock') || (field === 'flex' && value !== 'Stock') || field === 'detune' || field === 'skinClip';
  if (!r.verified && custom) return 'Custom construction for Mango 114 needs ON3P confirmation.';
  if (field === 'layup' && !r.layups.includes(value)) return `${value} is not offered for ${ctx.model.name}.`;
  if (field === 'flex' && !r.flex[config.layup]?.includes(value)) return `${config.layup} requires Stock flex.`;
  if (field === 'detune' && !r.detune) return `${ctx.model.name} uses All mountain tune only.`;
  if (field === 'skinClip' && r.skinClip === 'included') return 'Skin clip is standard on Billy Goat 108, at no extra cost.';
  if (field === 'skinClip' && r.skinClip === 'unavailable') return `Skin clips are not offered for ${ctx.model.name}.`;
  return '';
}

const galleryItems = (list, key) => list.map(g => ({value: g.id, label: g.name, graphic: g, price: artworkPrice(key, g.id)}));
const topItems = galleryItems(catalog.tops, 'top');
const baseItems = galleryItems(catalog.bases, 'base');

const steps = [
  {id: 'shape', label: 'Shape', title: 'Find your shape', intro: 'How do you ski? Start there, then choose your model and length.', link: {href: 'https://www.on3pskis.com/pages/custom-ski-fit-check', strong: 'Not sure?', text: 'Talk skis with Scott at ON3P'}},
  {
    id: 'graphics',
    label: 'Graphics',
    title: 'Make them yours',
    intro: 'Original ON3P artwork, in your combination.',
    layout: 'tabs',
    tabsLabel: 'Artwork surface',
    tabs: [
      {group: 'top', label: 'Topsheet', view: 'Topsheet'},
      {group: 'base', label: 'Base', view: 'Base'},
      {group: 'sidewall', label: 'Sidewalls', view: 'Topsheet'},
    ],
    footnote: 'Public catalog snapshot. Custom uploads and mix-and-match art are outside this concept.',
  },
  {id: 'construction', label: 'Construction', title: 'Dial in the feel', intro: 'Choose what’s inside, and see exactly what changes.', footnote: 'Reference prices. Metal layups are shown at their regular $150 upgrade price. Options follow ON3P’s published builder rules; availability can change.'},
  {id: 'review', label: 'Review', title: 'Your pair', intro: 'Every choice in one place. Nothing is ordered from this concept.', link: {href: 'https://www.on3pskis.com/products/custom-skis', strong: 'Ready for the real thing?', text: 'Explore customs at ON3P'}},
];

const groups = [
  {
    id: 'category',
    type: 'category',
    step: 'shape',
    label: 'Category',
    bom: false,
    explain: false,
    resets: ['model', 'length'],
    options: () => categories.map(g => ({value: g.id, label: g.id, description: g.description, meta: `${g.models.length} shapes`})),
    // A link or save without a category takes the category of its model.
    default: (config, ctx, input = {}) => {
      const model = modelsByHandle.get(input.model);
      return model ? categories.find(g => g.models.includes(model.handle)).id : '';
    },
    ui: {field: 'The way you ski'},
  },
  {
    id: 'model',
    type: 'model',
    step: 'shape',
    label: 'Model',
    bomLabel: 'Ski pair',
    required: true,
    options: (config, ctx) => (ctx.category?.models ?? []).map(handle => ({value: handle, label: modelsByHandle.get(handle).name})),
    format: value => modelsByHandle.get(value)?.name || 'Choose your model',
    price: () => PRICES.skis,
    ui: {
      field: 'Your model',
      visible: config => !!config.category,
      selectLabel: config => `${config.category} model`,
      placeholder: config => `Choose your ${config.category.toLowerCase()} model`,
      description: (config, ctx) => ctx.model?.description,
      action: {label: 'View specs', guide: 'specs', visible: config => !!config.model},
      hint: config => (config.category === 'Touring' ? 'These shapes also appear in ON3P’s Touring collection. Selecting one starts with Tour layup (+$150); you can change the layup later.' : ''),
    },
  },
  {
    id: 'length',
    type: 'length',
    step: 'shape',
    label: 'Length',
    required: true,
    options: (config, ctx) => ctx.lengths.map(length => ({value: length, label: String(length)})),
    format: value => (value ? `${value} cm` : 'Choose your length'),
    ui: {
      field: 'Length · cm',
      visible: config => !!config.model,
      action: {label: 'Size guide', guide: 'size'},
      hint: (config, ctx) => [
        !config.length && 'Select a length to continue. We never pick a size for you.',
        ctx.rules?.timing[config.length],
        config.model === 'woodsman-92' && '166 cm appears in the spec table but is unavailable in the live custom builder.',
      ].filter(Boolean),
      note: (config, ctx) => (ctx.rules && !ctx.rules.verified ? {text: ctx.rules.notes[0]} : null),
    },
  },
  {
    id: 'rocker',
    type: 'choice',
    step: 'shape',
    label: 'Rocker',
    options: () => [
      {value: 'Signature', label: 'Signature', text: 'The model’s original profile'},
      {value: 'Ripper', label: 'Ripper', text: 'More camber, more edge'},
    ],
    default: () => 'Signature',
    reason: (value, config, ctx) => (value === 'Ripper' && !canRipper(ctx.model, config.length) ? rockerReason(config, ctx) : ''),
    line: (value, config, ctx, ready) => ({pending: !ready}),
    ui: {display: 'cards', visible: config => !!config.length, action: {label: 'About rocker', guide: 'rocker'}, hint: (config, ctx) => rockerReason(config, ctx)},
  },
  {
    id: 'top',
    type: 'gallery',
    step: 'graphics',
    label: 'Topsheet',
    options: () => topItems,
    default: () => 'ANSWER-0by9xp',
    price: value => artworkPrice('top', value),
    ui: {
      view: 'Topsheet',
      selectionLabel: 'Selected topsheet',
      searchPlaceholder: n => `Search ${n} topsheets`,
      filters: () => ['All', 'Blackout', 'Color', 'Graphic', 'Wood'],
      filterOf: item => graphicCategory(item.graphic),
      hint: config => (topsById.get(config.top)?.name.startsWith('Wood ') ? 'Wood veneer adds $250. ON3P’s builder lists approximately 50 days for wood tops; confirm the current ship date before ordering.' : ''),
    },
  },
  {
    id: 'base',
    type: 'gallery',
    step: 'graphics',
    label: 'Base',
    options: () => baseItems,
    default: () => 'ANSWER-4bxfxp',
    price: value => artworkPrice('base', value),
    ui: {view: 'Base', selectionLabel: 'Selected base', searchPlaceholder: n => `Search ${n} bases`, filters: () => ['All', 'Color', 'Graphic'], filterOf: item => graphicCategory(item.graphic)},
  },
  {
    id: 'sidewall',
    type: 'choice',
    step: 'graphics',
    label: 'Sidewalls',
    options: () => sidewalls.map(([value, color]) => ({value, label: value, color})),
    default: () => 'Black',
    price: value => (value === 'Black' ? 0 : PRICES.sidewall),
    ui: {
      display: 'swatches',
      field: 'Sidewall color',
      selectionLabel: 'Sidewall color',
      bodyCopy: () => 'The same full-height UHMW sidewall in a different finish. Black is included; every other color adds $50.',
      note: () => ({tone: 'quiet', text: 'The preview draws the sidewall as an outline. Actual color and how much of it shows will differ on a finished ski.'}),
    },
  },
  {
    id: 'layup',
    type: 'choice',
    step: 'construction',
    label: 'Layup',
    options: () => layups.map(l => ({value: l.id, label: l.id, tag: l.tag, description: l.description, tradeoff: l.tradeoff, specs: [['Core', l.core], ['Base', l.base], ['Edges', l.edge], ['Weight', l.weight]]})),
    default: () => 'Stock',
    reason: (value, config, ctx) => optionReason(config, 'layup', value, ctx),
    price: value => layups.find(l => l.id === value)?.price ?? 0,
    ui: {display: 'list', action: {label: 'Compare layups', guide: 'layups'}},
  },
  {
    id: 'flex',
    type: 'choice',
    step: 'construction',
    label: 'Flex',
    options: () => flexOptions.map(f => ({value: f.id, label: f.id})),
    default: () => 'Stock',
    reason: (value, config, ctx) => optionReason(config, 'flex', value, ctx),
    price: value => (value === 'Stock' ? 0 : PRICES.flex),
    ui: {
      display: 'segmented',
      fieldNote: config => (config.flex === 'Stock' ? 'Included' : `+$${PRICES.flex}`),
      hint: (config, ctx) => optionReason(config, 'flex', 'Soft', ctx) || flexOptions.find(f => f.id === config.flex)?.hint,
    },
  },
  {
    id: 'detune',
    type: 'toggle',
    step: 'construction',
    label: 'Edge tune',
    reason: (value, config, ctx) => (value ? optionReason(config, 'detune', value, ctx) : ''),
    price: value => (value ? PRICES.detune : 0),
    format: value => (value ? 'Park detune' : 'All mountain'),
    ui: {fieldGroup: 'Finishing', title: 'Park detune', description: 'Rounded edges underfoot for rails. Less grip on hard snow.', priceLabel: () => `+$${PRICES.detune}`},
  },
  {
    id: 'skinClip',
    type: 'toggle',
    step: 'construction',
    label: 'Tail',
    fixed: (config, ctx) => (ctx.rules?.skinClip === 'included' ? true : undefined),
    reason: (value, config, ctx) => (value ? optionReason(config, 'skinClip', value, ctx) : ''),
    price: (value, config, ctx) => (value && ctx.rules?.skinClip !== 'included' ? PRICES.skinClip : 0),
    format: value => (value ? 'Skin clip' : 'Stock tail'),
    ui: {
      fieldGroup: 'Finishing',
      title: 'Skin clip notch',
      description: 'Keeps a climbing-skin tail clip centered. May catch skiing switch in deep snow.',
      priceLabel: (config, ctx) => (ctx.rules?.skinClip === 'included' ? 'Included' : `+$${PRICES.skinClip}`),
    },
  },
];

const sidewallColor = name => sidewalls.find(([id]) => id === name)?.[1] ?? '#151515';
const artShape = {width: SKI_WIDTH, length: SKI_BOTTOM - SKI_TOP, gap: PAIR_LEFTS.top[1] - PAIR_LEFTS.top[0] - SKI_WIDTH};
const faceLayers = (graphic, face, crops, url) => {
  const kind = face === 'Base' ? 'base' : 'top';
  const [left, right] = PAIR_LEFTS[kind];
  return {left: [cropLayer(url(graphic), crops[kind], left)], right: [cropLayer(url(graphic), crops[kind], right)]};
};

export function estimateWeight(config, ctx) {
  if (!ctx.spec) return null;
  const layup = layups.find(l => l.id === config.layup) ?? layups[0];
  return {
    unit: 'g',
    per: 'ski',
    base: {value: ctx.spec.weight_g, label: `Stock layup, ${ctx.spec.length_cm} cm`},
    items: layup.id === 'Stock' ? [] : [{label: `${layup.id} layup`, min: layup.weightDelta[0], max: layup.weightDelta[1]}],
  };
}

const pack = {
  id: 'on3p',
  name: 'ON3P',
  currency: 'USD',
  steps,
  groups,
  context,
  // Touring starts every newly chosen shape with the Tour layup.
  beforeNormalize: (previous, patch, requested) => (patch.model && patch.model !== previous.model && requested.category === 'Touring' ? {...requested, layup: 'Tour'} : requested),
  explain: (group, previous, config, ctx) => {
    if (group.id === 'rocker') return `Rocker: ${previous.rocker} → ${config.rocker}. ${rockerReason(config, ctx)}`;
    if (group.id === 'layup' && config.layup === 'Tour' && previous.layup !== 'Tour') return `Layup: ${previous.layup} → Tour. Touring starts with Tour layup.`;
    return '';
  },
  ready: (config, ctx) => !!config.category && !!ctx.model && ctx.lengths.includes(config.length),
  weight: estimateWeight,
  viewForField: field => (field === 'base' ? 'Base' : 'Topsheet'),
  copy: {
    exportTitle: 'ON3P CUSTOM SHOP — FAN CONCEPT',
    totalLabel: 'Reference total',
    incompleteDraft: 'Incomplete draft: choose a model and length.',
    exportNotes: [
      'Independent fan prototype. No order has been placed. Price excludes promotional discounts, bindings, shipping and tax. Metal uses its regular $150 upgrade price. Compatibility follows a public catalog snapshot; Mango 114 custom construction is held for confirmation. Artwork preview is illustrative. Weight estimates add ON3P’s published layup ranges to the stock weight.',
      `Source: ${compatibility.source}`,
      `Specification revision ${catalog.specVersion}; compatibility observed ${compatibility.observed}.`,
    ],
    sheetNote: 'Starting artwork and stock construction are included defaults until you review them. Prices exclude promotions, bindings, tax and shipping. Independent fan concept; no orders are placed.',
    priceNote: 'Excludes promotional discounts, bindings, tax and shipping. This is an independent fan concept; no order is placed.',
  },
  exportHeader: config => [`Category: ${config.category || 'Not selected'}`],
  review: {
    heroMeta: config => `${config.length} cm · ${config.category}`,
    priceKeys: ['model', 'top', 'base', 'sidewall', 'layup', 'flex', 'detune', 'skinClip'],
    priceLabel: line => (line.key === 'model' ? 'Custom skis' : line.key === 'skinClip' ? line.value : `${line.value} ${line.label.toLowerCase()}`),
    weightLabel: 'Estimated weight',
  },
  stage: {
    sampleModel: 'jeffrey-106',
    preferredLength: 186,
    maxLength: 191,
    origin: 'Handbuilt in Portland, Oregon',
    family: model => familyOf(model),
    category: config => config.category,
    detail: (config, ctx, face, lengthChosen) => [
      lengthChosen ? `${config.length} cm` : null,
      `${config.rocker} rocker`,
      face === 'Base' ? `${basesById.get(config.base).name} base` : `${topsById.get(config.top).name} topsheet`,
    ].filter(Boolean),
    sampleText: (config, ctx) => `Shown: ${ctx.model.name} with ${topsById.get(config.top).name}. Start with how you ski.`,
    hints: {art: 'Illustrative preview · schematic outline', technical: 'Schematic · published dimensions · profile exaggerated'},
  },
  art: {
    faces: ['Topsheet', 'Base'],
    zoomLevels: [1, 1.6, 2.4],
    shape: (config, ctx) => {
      const inset = waistInset(ctx.model.waist_mm);
      return {...artShape, path: () => skiPath(inset)};
    },
    surface: (config, face) => {
      const graphic = face === 'Base' ? basesById.get(config.base) : topsById.get(config.top);
      return {
        ...faceLayers(graphic, face, CROPS.stage, stageArt),
        edge: face === 'Base' ? {color: '#8e959c', width: 3} : {color: sidewallColor(config.sidewall), width: 4},
      };
    },
    swatch: (item, groupId) => faceLayers(item.graphic, groupId === 'base' ? 'Base' : 'Topsheet', CROPS.thumb, thumbArt),
  },
  specs: {
    readout: (config, ctx, weight, lengthChosen) => {
      const {model, spec} = ctx;
      if (!lengthChosen) {
        const lengths = ctx.lengths;
        return [
          ['Waist', model.waist_mm, 'mm'],
          ['Lengths', `${Math.min(...lengths)}–${Math.max(...lengths)}`, 'cm'],
        ];
      }
      return [
        ['Tip · waist · tail', `${spec.tip_mm} · ${spec.waist_mm} · ${spec.tail_mm}`, 'mm'],
        ['Turn radius', spec.turn_radius_m, 'm'],
        [config.layup === 'Stock' ? 'Stock weight' : `Est. weight · ${config.layup}`, weight.value, 'g / ski'],
      ];
    },
    geometry: (config, ctx) => {
      const {model, spec} = ctx;
      if (!spec) return null;
      const surface = pack.art.surface(config, 'Topsheet');
      const rocker = config.rocker === 'Signature' && model.rocker === 'Signature Pow' ? 'Signature Pow' : config.rocker;
      const weightText = formatWeight(estimateWeight(config, ctx)).text;
      return {
        name: model.name,
        length_mm: spec.length_cm * 10,
        maxLength_mm: 1910,
        tip_mm: spec.tip_mm,
        waist_mm: spec.waist_mm,
        tail_mm: spec.tail_mm,
        mount_cm: spec.mount_from_center_cm,
        profile: {kind: 'schematic', rocker, contact_mm: rocker === 'Ripper' ? spec.effective_edge_mm * 1.06 : spec.effective_edge_mm},
        profileLabel: rocker,
        contactLabel: rocker === 'Ripper' ? 'Snow contact · Ripper adds edge beyond the published figure' : 'Snow contact · effective edge',
        edge: sidewallColor(config.sidewall),
        art: {width: SKI_WIDTH, length: SKI_BOTTOM - SKI_TOP, layers: surface.left},
        stats: [
          ['Turn radius', `${spec.turn_radius_m} m`],
          [config.layup === 'Stock' ? 'Stock weight' : 'Est. weight', weightText],
          ['Effective edge', `${spec.effective_edge_mm.toLocaleString('en-US')} mm`],
        ],
        caption: 'Schematic drawing from ON3P’s published dimensions · profile height exaggerated · not a manufacturing drawing',
      };
    },
  },
};

export default pack;
