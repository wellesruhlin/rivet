// ON3P on the shared Arc engine: the flagship configurator's rules, steps and copy as a
// brand pack. Rules and prices follow the public builder snapshot in PRODUCT-RELATIONSHIPS.md.
import {formatMoney, formatWeight} from '@arc/configurator/engine';
import {
  PRICES, DEFAULT_ART, catalog, categories, compatibility, familyOf, flexOptions, layups, sidewalls,
  artworkPrice, baseById, canRipper, getModel, graphicCategory, modelByHandle, optionReason, prepareSkiChange,
  rockerReason, sidewallColor, stockFor, topById,
} from './rules.js';
import {bindingCatalog, bindingFit, bindingFor, bindingLabel} from './bindings.js';
import {CROPS, PAIR_LEFTS, SKI_LENGTH, SKI_WIDTH, assetUrl, cropLayer, skiPath, stageArt, thumbArt, waistInset} from './art.js';
import {model3d} from './model3d.js';

const money = amount => formatMoney(amount);

function context(config) {
  const model = modelByHandle(config.model);
  const rules = model ? compatibility.models[model.handle] : undefined;
  return {
    model: model && {...model, id: model.handle},
    rules,
    category: categories.find(g => g.id === config.category),
    lengths: rules?.lengths ?? [],
    spec: model?.lengths.find(l => l.length_cm === config.length),
  };
}
const waistOf = (config, ctx) => ctx.spec?.waist_mm ?? null;

// Why a binding variant can't join this build, or ''. Unorderable variants can still be
// mounted as a visual test.
function bindingReason(value, config, ctx) {
  const binding = bindingFor(value);
  if (!binding) return 'This binding is no longer in the catalog.';
  if (!binding.available) return `${binding.color} / ${binding.brake} mm is listed unavailable.`;
  const fit = bindingFit(binding, waistOf(config, ctx));
  return fit.ok ? '' : fit.text;
}
const bindingNote = product => (product.id === 'pivot-15'
  ? 'The Blender model shows an approximate Pivot 15 at the ski’s reference mount point with a 320 mm boot sole. It does not confirm boot or brake fit.'
  : 'The Pivot 13’s composite toe has not been modeled yet, so the skis show the Pivot 15 model in black as a stand-in.');

const galleryItems = (list, key) => list.map(g => ({value: g.id, label: g.name, graphic: g, price: artworkPrice(key, g.id)}));
const topItems = galleryItems(catalog.tops, 'top');
const baseItems = galleryItems(catalog.bases, 'base');

export const steps = [
  {id: 'shape', label: 'Shape', title: 'Shape', intro: config => (config.category ? '' : 'Choose your skiing style to find your shape.'), link: {href: 'https://www.on3pskis.com/pages/custom-ski-fit-check', strong: 'Not sure?', text: 'Talk skis with Scott at ON3P'}},
  {
    id: 'graphics',
    label: 'Graphics',
    title: 'Graphics',
    intro: 'Original ON3P artwork, in your combination.',
    layout: 'tabs',
    tabsLabel: 'Artwork surface',
    tabs: [
      {group: 'top', label: 'Topsheet', view: 'Topsheet'},
      {group: 'base', label: 'Base', view: 'Base'},
      {group: 'sidewall', label: 'Sidewalls', view: 'Sidewall'},
    ],
    footnote: 'Public catalog snapshot. Custom uploads and mix-and-match art are outside this concept.',
  },
  {id: 'construction', label: 'Construction', title: 'Construction', intro: 'Choose what’s inside, and see exactly what changes.', footnote: 'Reference prices. Metal layups are shown at their regular $150 upgrade price. Options follow ON3P’s published builder rules; availability can change.'},
  {id: 'bindings', label: 'Bindings', title: 'Bindings', intro: 'A pair of bindings, or just the skis. Your call.'},
  {id: 'review', label: 'Review', title: 'Review', intro: 'Every choice in one place. Nothing is ordered from this concept.', link: {href: 'https://www.on3pskis.com/products/custom-skis', strong: 'Ready for the real thing?', text: 'Explore customs at ON3P'}},
];

export const groups = [
  {
    id: 'category',
    type: 'category',
    step: 'shape',
    label: 'Category',
    bom: false,
    explain: false,
    // prepareSkiChange clears the model and length when the category changes.
    options: () => categories.map(g => ({value: g.id, label: g.id, description: g.description, meta: `${g.models.length} shapes`})),
    // A link or save without a category takes the category of its model.
    default: (config, ctx, input = {}) => {
      const model = modelByHandle(input.model);
      return model ? categories.find(g => g.models.includes(model.handle)).id : '';
    },
    ui: {field: 'The way you ski', collapse: true, summaryLabel: 'Skiing style'},
  },
  {
    id: 'model',
    type: 'model',
    step: 'shape',
    label: 'Model',
    bomLabel: 'Ski pair',
    required: true,
    options: (config, ctx) => (ctx.category?.models ?? []).map(handle => ({value: handle, label: modelByHandle(handle).name})),
    format: value => modelByHandle(value)?.name || 'Choose your model',
    price: () => PRICES.skis,
    ui: {
      field: 'Your model',
      visible: config => !!config.category,
      selectLabel: config => `${config.category} model`,
      placeholder: config => `Choose your ${config.category.toLowerCase()} model`,
      description: (config, ctx) => ctx.model?.description,
      descriptionLabel: 'About this ski',
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
      ariaLabel: 'Length in centimeters',
      visible: config => !!config.model,
      action: {label: 'Size guide', guide: 'size'},
      hint: (config, ctx) => [
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
    options: (config, ctx) => [
      {value: 'Signature', label: 'Signature', text: 'Original profile', disabled: !config.length},
      {value: 'Ripper', label: 'Ripper', text: 'More camber & edge', disabled: !config.length || !canRipper(ctx.model, config.length)},
    ],
    default: () => 'Signature',
    reason: (value, config, ctx) => (value === 'Ripper' && !canRipper(ctx.model, config.length) ? rockerReason(config) : ''),
    line: (value, config, ctx, ready) => ({pending: !ready}),
    ui: {
      display: 'cards',
      ariaLabel: 'Rocker profile',
      visible: config => !!config.model,
      action: {label: 'About rocker', guide: 'rocker'},
      hint: (config, ctx) => (!config.length ? 'Choose a length to unlock rocker options.' : !canRipper(ctx.model, config.length) ? rockerReason(config) : ''),
    },
  },
  {
    id: 'top',
    type: 'gallery',
    step: 'graphics',
    label: 'Topsheet',
    explain: false,
    options: () => topItems,
    // A link or save without artwork starts with its model's stock topsheet.
    default: (config, ctx, input = {}) => stockFor(input.model)?.top ?? DEFAULT_ART.top,
    price: value => artworkPrice('top', value),
    ui: {
      view: 'Topsheet',
      selectionLabel: 'Selected topsheet',
      searchPlaceholder: n => `Search ${n} topsheets`,
      filters: () => ['All', 'Blackout', 'Color', 'Graphic', 'Wood'],
      filterOf: item => graphicCategory(item.graphic),
      hint: config => (topById(config.top)?.name.startsWith('Wood ') ? 'Wood veneer adds $250. ON3P’s builder lists approximately 50 days for wood tops; confirm the current ship date before ordering.' : ''),
    },
  },
  {
    id: 'base',
    type: 'gallery',
    step: 'graphics',
    label: 'Base',
    explain: false,
    options: () => baseItems,
    default: (config, ctx, input = {}) => stockFor(input.model)?.base ?? DEFAULT_ART.base,
    price: value => artworkPrice('base', value),
    ui: {view: 'Base', selectionLabel: 'Selected base', searchPlaceholder: n => `Search ${n} bases`, filters: () => ['All', 'Color', 'Graphic'], filterOf: item => graphicCategory(item.graphic)},
  },
  {
    id: 'sidewall',
    type: 'choice',
    step: 'graphics',
    label: 'Sidewalls',
    explain: false,
    options: () => sidewalls.map(([value, color]) => ({value, label: value, color})),
    default: () => 'Black',
    price: value => (value === 'Black' ? 0 : PRICES.sidewall),
    ui: {
      display: 'swatches',
      field: 'Sidewall color',
      selectionLabel: 'Sidewall color',
      view: 'Sidewall',
      bodyCopy: () => 'The same full-height UHMW sidewall in a different finish. Black is included; every other color adds $50.',
      note: () => ({tone: 'quiet', text: 'Drag the ski to see the full-height sidewall. Actual color and dimensions may differ on a finished ski.'}),
    },
  },
  {
    id: 'layup',
    type: 'choice',
    step: 'construction',
    label: 'Layup',
    options: () => layups.map(l => ({value: l.id, label: l.id, tag: l.tag, description: l.description, tradeoff: l.tradeoff, specs: [['Core', l.core], ['Base', l.base], ['Edges', l.edge], ['Weight', l.weight]]})),
    default: () => 'Stock',
    reason: (value, config) => optionReason(config, 'layup', value),
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
    reason: (value, config) => optionReason(config, 'flex', value),
    price: value => (value === 'Stock' ? 0 : PRICES.flex),
    ui: {
      display: 'segmented',
      fieldNote: config => (config.flex === 'Stock' ? 'Included' : `+$${PRICES.flex}`),
      hint: config => optionReason(config, 'flex', 'Soft') || flexOptions.find(f => f.id === config.flex)?.hint,
    },
  },
  {
    id: 'detune',
    type: 'toggle',
    step: 'construction',
    label: 'Edge tune',
    reason: (value, config) => (value ? optionReason(config, 'detune', value) : ''),
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
    reason: (value, config) => (value ? optionReason(config, 'skinClip', value) : ''),
    price: (value, config, ctx) => (value && ctx.rules?.skinClip !== 'included' ? PRICES.skinClip : 0),
    format: value => (value ? 'Skin clip' : 'Stock tail'),
    ui: {
      fieldGroup: 'Finishing',
      title: 'Skin clip notch',
      description: 'Keeps a climbing-skin tail clip centered. May catch skiing switch in deep snow.',
      priceLabel: (config, ctx) => (ctx.rules?.skinClip === 'included' ? 'Included' : `+$${PRICES.skinClip}`),
    },
  },
  {
    id: 'binding',
    type: 'binding',
    step: 'bindings',
    label: 'Bindings',
    options: () => bindingCatalog.products.flatMap(p => p.variants.map(v => ({value: v.id, label: bindingLabel(v.id)}))),
    reason: bindingReason,
    default: () => '',
    price: value => bindingFor(value)?.price ?? 0,
    format: value => bindingLabel(value),
    // "Skis only" is a choice, not a missing one.
    line: () => ({pending: false}),
    explain: false,
    ui: {
      carryOn: ['category', 'model', 'length'],
      intro: 'Choose a binding to mount it on your skis. Orderable pairs add to your total; others can still be tried on as a visual test.',
      products: () =>
        bindingCatalog.products.map(p => ({
          id: p.id,
          name: p.name.replace('LOOK ', ''),
          meta: `DIN ${p.din} · ${money(p.variants[0].price)} / pair`,
          image: assetUrl(p.variants[0].image),
          preferred: p.variants.find(v => v.brake === 115 && v.color === 'Black')?.id,
          variants: p.variants.map(v => ({value: v.id, color: v.color, brake: v.brake, price: v.price, image: assetUrl(v.image), available: v.available})),
        })),
      fit: (variant, config, ctx) => bindingFit(variant, waistOf(config, ctx)),
      waist: waistOf,
      details: (product, variant) => {
        const binding = bindingFor(variant.value);
        return {
          photo: {src: assetUrl(binding.image), alt: `${binding.product.name} in ${binding.color}`, credit: 'ON3P product photograph'},
          specs: [['Toe', binding.product.toe], ['Boot soles', binding.product.bootCompatibility]],
          note: bindingNote(binding.product),
          link: {href: binding.product.source, label: 'Check this binding at ON3P'},
        };
      },
      catalogNote: 'Faded options aren’t orderable for this ski. Catalog checked September 24, 2026; availability can change.',
      footnotes: () => ['Final mounting, boot compatibility and release settings need a qualified shop. No DIN setting is calculated here. Mounting and package discounts are not included.'],
      more: {
        summary: 'Replacement brake accessory',
        text: 'ON3P also lists a Pivot 1.0 replacement brake. It is an accessory, not an additional binding model or a verified 2.0 conversion.',
        href: bindingCatalog.accessory.source,
        linkLabel: 'See the replacement brake at ON3P',
      },
      reviewNote: (config, ctx, previewBinding) => {
        const visual = bindingFor(previewBinding);
        if (visual) return `Shown on your skis but not in your total: ${visual.available ? bindingFit(visual, waistOf(config, ctx)).text : `${visual.color} / ${visual.brake} mm is listed unavailable.`} Your binding choice stays in saved builds, shared links and downloads as a visual selection.`;
        return config.binding ? `${bindingFor(config.binding).product.bootCompatibility}. Mounting and final fit are a shop service, not part of this estimate.` : '';
      },
    },
  },
];

const artShape = {width: SKI_WIDTH, length: SKI_LENGTH, gap: PAIR_LEFTS.top[1] - PAIR_LEFTS.top[0] - SKI_WIDTH};
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
  beforeNormalize: prepareSkiChange,
  explain: (group, previous, config, ctx) => {
    if (group.id === 'rocker') return `Rocker: ${previous.rocker} → ${config.rocker}. ${rockerReason(config)}`;
    if (group.id === 'layup' && config.layup === 'Tour' && previous.layup !== 'Tour') return `Layup: ${previous.layup} → Tour. Touring starts with Tour layup.`;
    // Construction changes name the rule that forced them (for a tail or tune, whatever the
    // direction of the change).
    if (['layup', 'flex', 'detune', 'skinClip'].includes(group.id)) {
      const format = value => (group.format ? group.format(value) : value);
      const reason = optionReason(config, group.id, previous[group.id]);
      return `${group.label}: ${format(previous[group.id])} → ${format(config[group.id])}.${reason ? ` ${reason}` : ''}`;
    }
    return '';
  },
  // A pair carried through a shape edit is re-checked: the price moves either way, so say so.
  changeNotes: (previous, patch, config, ctx) => {
    if (previous.binding && !config.binding && patch.binding !== '') {
      const binding = bindingFor(previous.binding);
      const reason = binding && !binding.available ? 'That variant was unavailable in the latest catalog snapshot.' : binding ? bindingFit(binding, waistOf(config, ctx)).text : 'This binding is no longer in the catalog.';
      return [{field: 'binding', text: `Bindings are no longer in your total. ${reason}${binding ? ' The pair stays on your skis as a visual test.' : ''}`}];
    }
    if (!previous.binding && config.binding && ['model', 'length', 'category'].some(field => Object.hasOwn(patch, field))) {
      const binding = bindingFor(config.binding);
      return [{field: 'binding', text: `Bindings added to your total (+${money(binding.price)}). ${bindingFit(binding, waistOf(config, ctx)).text}`}];
    }
    return [];
  },
  ready: (config, ctx) => !!config.category && !!ctx.model && ctx.lengths.includes(config.length),
  // Base, then sidewalls: defaults are accepted explicitly before moving past Graphics.
  confirm: {
    step: 'graphics',
    fields: ['base', 'sidewall'],
    label: (missing, field, config) => (missing === 'base'
      ? field === 'base' ? 'Use this base' : 'Pick a base'
      : field === 'sidewall' ? `Use ${config.sidewall.toLowerCase()} sidewalls` : 'Pick a sidewall'),
  },
  weight: estimateWeight,
  viewForField: (field, step) => (step === 3 || field === 'binding' ? 'Bindings' : step === 2 || ['layup', 'flex', 'detune', 'skinClip'].includes(field) ? 'Construction' : field === 'base' ? 'Base' : field === 'sidewall' ? 'Sidewall' : 'Topsheet'),
  fileName: (config, ctx) => `ON3P-${ctx.model?.name.replaceAll(' ', '-') || 'draft'}-${config.length || 'unsized'}cm-build.txt`,
  exportVisual: (id, config, ctx) => {
    const binding = bindingFor(id);
    return binding ? `Saved visual binding selection: ${bindingLabel(id)} (variant ${id}) — not in reference total; availability and fit require review.` : null;
  },
  copy: {
    exportTitle: 'ON3P CUSTOM SHOP — FAN CONCEPT',
    totalLabel: 'Reference total',
    incompleteDraft: 'Incomplete draft: choose a model and length.',
    exportNotes: [
      'Independent fan prototype. No order has been placed. Price includes selected binding pairs and excludes promotional discounts, mounting, shipping and tax. Binding availability is a snapshot; final boot/brake fit and release settings require a qualified shop. Metal uses its regular $150 upgrade price. Compatibility follows a public catalog snapshot; Mango 114 custom construction is held for confirmation. Artwork preview is illustrative. Weight estimates add ON3P’s published layup ranges to the stock weight.',
      `Source: ${compatibility.source}`,
      `Specification revision ${catalog.specVersion}; compatibility observed ${compatibility.observed}.`,
    ],
    sheetNote: 'Starting artwork and stock construction are included defaults until you review them. Prices exclude promotions, mounting, tax and shipping. Independent fan concept; no orders are placed.',
    priceNote: 'Includes selected binding pairs. Excludes promotional discounts, mounting, tax and shipping. This is an independent fan concept; no order is placed.',
    firstStep: {
      cta: config => (!config.category ? 'Choose ski style' : !config.model ? 'Choose a model' : 'Choose a length'),
      short: config => (!config.category ? 'Choose ski style' : !config.model ? 'Choose a model' : 'Choose a length'),
      chip: 'Choose your shape',
      missing: 'select a length',
    },
    emptyBuild: 'Choose your shape',
    loading: 'Loading your ski…',
  },
  exportHeader: config => [`Category: ${config.category || 'Not selected'}`],
  // The exact build goes to the local maker desk for review, a confirmed quote and an
  // order export. Local pilot only; nothing is sent to ON3P.
  handoff: {
    title: 'Take it to the maker desk',
    text: 'Save this exact build for review, a confirmed quote and an order export. Local pilot only; nothing is sent to ON3P.',
    button: 'Request maker review',
    available: () => typeof location !== 'undefined' && ['localhost', '127.0.0.1'].includes(location.hostname),
    submit: async (config, {previewBinding}) => {
      if (previewBinding && !bindingFor(previewBinding)) throw new Error('Review the saved binding choice before submitting.');
      const [{submitForReview, reviewPath}, {skiProduct}] = await Promise.all([import('@arc/configurator/product/handoff-client'), import('./product.js')]);
      const reference = previewBinding ? `Visual only, excluded: ${bindingLabel(previewBinding)} [${previewBinding}]` : '';
      const result = await submitForReview(skiProduct, config, {reference});
      const desk = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MAKER_DESK_URL) || 'http://127.0.0.1:5192';
      return desk + reviewPath(result);
    },
  },
  review: {
    heroMeta: config => `${config.length} cm · ${config.rocker} rocker · ${config.category}`,
    barMeta: config => (config.length ? `${config.length} cm · ${config.rocker} rocker` : 'Select your length'),
    priceKeys: ['model', 'top', 'base', 'sidewall', 'layup', 'flex', 'detune', 'skinClip', 'binding'],
    priceLabel: line => (line.key === 'model' ? 'Custom skis' : line.key === 'skinClip' || (line.key === 'binding' && line.value === 'Skis only') ? line.value : `${line.value} ${line.label.toLowerCase()}`),
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
      face === 'Base' ? `${baseById(config.base).name} base` : `${topById(config.top).name} topsheet`,
    ].filter(Boolean),
    sampleText: (config, ctx) => `Shown: ${ctx.model.name} with ${topById(config.top).name}. Start with how you ski.`,
    hints: {art: 'Illustrative preview · schematic outline', technical: 'Schematic · published dimensions · profile exaggerated'},
  },
  model3d,
  art: {
    faces: ['Topsheet', 'Base'],
    zoomLevels: [1, 1.6, 2.4],
    shape: (config, ctx) => {
      const inset = waistInset(ctx.model.waist_mm);
      return {...artShape, path: () => skiPath(inset)};
    },
    surface: (config, face) => {
      const graphic = face === 'Base' ? baseById(config.base) : topById(config.top);
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
        art: {width: SKI_WIDTH, length: SKI_LENGTH, layers: surface.left},
        stats: [
          ['Turn radius', `${spec.turn_radius_m} m`],
          [config.layup === 'Stock' ? 'Stock weight' : 'Est. weight', formatWeight(estimateWeight(config, ctx)).text],
          ['Effective edge', `${spec.effective_edge_mm.toLocaleString('en-US')} mm`],
        ],
        caption: 'Schematic drawing from ON3P’s published dimensions · profile height exaggerated · not a manufacturing drawing',
      };
    },
  },
};

export default pack;
export {getModel};
